import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import path from 'path';
import fs from 'fs/promises';

// Configure upload directory
const uploadDir = path.join(process.cwd(), 'public/Books');

// Improved function - बिना test file के permission check करता है
async function ensureUploadDir() {
  try {
    // Directory create करें अगर नहीं है
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Permission check करें बिना test file के
    await fs.access(uploadDir, fs.constants.F_OK | fs.constants.W_OK);
    
    logger.info(`Upload directory ensured and accessible: ${uploadDir}`);
  } catch (err) {
    logger.error(`Failed to ensure upload directory: ${err}`, { 
      stack: (err as Error).stack,
      uploadDir: uploadDir,
      solution: 'Set IIS_IUSRS and IUSR permissions to Full Control on Books folder'
    });
    throw new Error(`Upload directory setup failed. Check IIS permissions for Books folder: ${err}`);
  }
}

// Alternative permission check function - यदि ऊपर वाला काम न करे
async function checkDirectoryPermissions(dirPath: string): Promise<boolean> {
  try {
    // Directory accessibility check करें
    await fs.access(dirPath, fs.constants.F_OK | fs.constants.W_OK);
    return true;
  } catch (error) {
    logger.warn(`Directory permission check failed: ${error}`);
    return false;
  }
}

// Generate unique filename with counter
async function generateUniqueFilename(originalName: string): Promise<string> {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  let uniqueName = `${baseName}${ext}`;
  let counter = 1;

  while (true) {
    const filePath = path.join(uploadDir, uniqueName);
    try {
      await fs.access(filePath);
      // File exists, try next name
      uniqueName = `${baseName}(${counter})${ext}`;
      counter++;
    } catch (err) {
      // File does not exist, this name is available
      break;
    }
  }

  return uniqueName;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

// GET method - Books की list fetch करने के लिए
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const courseId = searchParams.get('courseId');
    const subjectId = searchParams.get('subjectId');
    const publicationId = searchParams.get('publicationId');
    const availableCopies = searchParams.get('availableCopies');

    const pool = await getConnection();
    let query = `
      SELECT b.*, c.courseName, s.Name as SubjectName, p.Name as PublicationName 
      FROM Books b
      LEFT JOIN Course c ON b.CourseId = c.id
      LEFT JOIN Subject s ON b.SubjectId = s.SubId
      LEFT JOIN Publication p ON b.PublicationId = p.PubId
      WHERE (b.Title LIKE @search OR b.IsbnNumber LIKE @search OR b.AccessionNumber LIKE @search)
    `;
    const params: any = { search: `%${search.trim()}%` };

    // Filter conditions apply करें
    if (status !== 'all') {
      query += ' AND b.IsActive = @isActive';
      params.isActive = status === 'active' ? 1 : 0;
    }
    if (courseId) {
      query += ' AND b.CourseId = @courseId';
      params.courseId = courseId;
    }
    if (subjectId) {
      query += ' AND b.SubjectId = @subjectId';
      params.subjectId = subjectId;
    }
    if (publicationId) {
      query += ' AND b.PublicationId = @publicationId';
      params.publicationId = publicationId;
    }
    if (availableCopies) {
      query += ' AND b.AvailableCopies >= @availableCopies';
      params.availableCopies = availableCopies;
    } 
    
    const result = await pool.request()
      .input('search', params.search)
      .input('isActive', params.isActive)
      .input('courseId', params.courseId)
      .input('subjectId', params.subjectId)
      .input('publicationId', params.publicationId)
      .input('availableCopies', params.availableCopies)
      .query(query);
    
    return NextResponse.json(result.recordset);
  } catch (error) {
    logger.error(`Error fetching books: ${error}`, { stack: (error as Error).stack });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST method - नई book add करने के लिए
export async function POST(req: NextRequest) {
  try {
    // Permission check करें पहले (improved method)
    await ensureUploadDir();
    
    const { body, file } = await parseFormData(req);
    const {
      IsbnNumber, Title, Author, Details, CourseId, Price, SubjectId, PublicationId,
      TotalCopies, Edition, Language, PublishedYear, CreatedBy, Barcode, AccessionNumber, Source
    } = body;

    // Required fields validation
    if (!IsbnNumber || !Title) {
      return NextResponse.json({ message: 'ISBN and Title are required' }, { status: 400 });
    }
    if (!CourseId || !SubjectId || !PublicationId) {
      return NextResponse.json({ message: 'Course, Subject, and Publication are required' }, { status: 400 });
    }

    // Data type validation
    if (Price && isNaN(parseFloat(Price))) {
      return NextResponse.json({ message: 'Invalid Price format' }, { status: 400 });
    }
    if (TotalCopies && isNaN(parseInt(TotalCopies))) {
      return NextResponse.json({ message: 'Invalid Total Copies' }, { status: 400 });
    }

    const pool = await getConnection();

    // File upload handle करें अगर file है
    let bookPhotoPath = null;
    if (file && file.size > 0) {
      const uploadResult = await handleFileUpload(file);
      if (uploadResult) {
        bookPhotoPath = `/Books/${uploadResult.filename}`;
        logger.info(`File uploaded successfully: ${uploadResult.filename}`);
      }
    }

    // Database में book insert करें
    const result = await pool.request()
      .input('IsbnNumber', IsbnNumber)
      .input('Title', Title)
      .input('Author', Author || null)
      .input('Details', Details || null)
      .input('CourseId', CourseId)
      .input('Price', Price ? parseFloat(Price) : null)
      .input('SubjectId', SubjectId)
      .input('PublicationId', PublicationId)
      .input('TotalCopies', TotalCopies ? parseInt(TotalCopies) : 1)
      .input('AvailableCopies', TotalCopies ? parseInt(TotalCopies) : 1)
      .input('Edition', Edition || null)
      .input('Language', Language || null)
      .input('PublishedYear', PublishedYear ? parseInt(PublishedYear) : null)
      .input('CreatedBy', CreatedBy || 'admin')
      .input('BookPhoto', bookPhotoPath)
      .input('Barcode', Barcode || null)
      .input('AccessionNumber', AccessionNumber || null)
      .input('Source', Source || null)
      .query(`
        INSERT INTO Books (
          IsbnNumber, Title, Author, Details, CourseId, Price, SubjectId, PublicationId,
          TotalCopies, AvailableCopies, Edition, Language, PublishedYear, CreatedBy, BookPhoto, Barcode,
          AccessionNumber, Source
        ) VALUES (
          @IsbnNumber, @Title, @Author, @Details, @CourseId, @Price, @SubjectId, @PublicationId,
          @TotalCopies, @AvailableCopies, @Edition, @Language, @PublishedYear, @CreatedBy, @BookPhoto, @Barcode,
          @AccessionNumber, @Source
        )
      `);

    logger.info(`Book added successfully: ${Title}`);
    return NextResponse.json({ message: 'Book added successfully' });
  } catch (error: any) {
    logger.error(`Error adding book: ${error.message}`, { 
      stack: error.stack,
      suggestion: 'If permission error, check IIS folder permissions for Books directory'
    });
    return NextResponse.json({ 
      message: error.message || 'Internal server error',
      hint: error.message.includes('EPERM') ? 'Check IIS permissions for Books folder' : undefined
    }, { status: 500 });
  }
}

// PUT method - existing book update करने के लिए
export async function PUT(req: NextRequest) {
  try {
    // Permission check करें
    await ensureUploadDir();
    
    const formData = await req.formData();

    let body: { [key: string]: string } = {};
    let file: File | null = null;
    
    // FormData parse करें
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        body[key] = value;
      } else if (key === 'BookPhoto' && value instanceof File && value.size > 0) {
        file = value;
      }
    }

    const {
      BookId, IsbnNumber, Title, Author, Details, CourseId, Price, SubjectId, PublicationId,
      TotalCopies, Edition, Language, PublishedYear, ModifiedBy, Barcode, AccessionNumber, Source
    } = body;

    // Validation
    if (!BookId || !IsbnNumber || !Title) {
      return NextResponse.json({ message: 'BookId, ISBN, and Title are required' }, { status: 400 });
    }
    if (!CourseId || !SubjectId || !PublicationId) {
      return NextResponse.json({ message: 'Course, Subject, and Publication are required' }, { status: 400 });
    }

    if (Price && isNaN(parseFloat(Price))) {
      return NextResponse.json({ message: 'Invalid Price format' }, { status: 400 });
    }
    if (TotalCopies && isNaN(parseInt(TotalCopies))) {
      return NextResponse.json({ message: 'Invalid Total Copies' }, { status: 400 });
    }

    const pool = await getConnection();

    // Existing book fetch करें
    const existingBookResult = await pool.request()
      .input('BookId', BookId)
      .query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');
    
    if (existingBookResult.recordset.length === 0) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 });
    }

    let bookPhotoPath = existingBookResult.recordset[0]?.BookPhoto || null;

    // New file upload handle करें
    if (file) {
      const uploadResult = await handleFileUpload(file);
      if (uploadResult) {
        // Old photo delete करें अगर successful upload है
        if (bookPhotoPath) {
          const oldPhotoPath = path.join(process.cwd(), 'public', bookPhotoPath);
          try {
            await fs.unlink(oldPhotoPath);
            logger.info(`Old photo deleted: ${bookPhotoPath}`);
          } catch (err) {
            logger.warn(`Could not delete old photo: ${err}`);
          }
        }
        bookPhotoPath = `/Books/${uploadResult.filename}`;
        logger.info(`New file uploaded: ${uploadResult.filename}`);
      }
    }

    // Database update करें
    const result = await pool.request()
      .input('BookId', BookId)
      .input('IsbnNumber', IsbnNumber)
      .input('Title', Title)
      .input('Author', Author || null)
      .input('Details', Details || null)
      .input('CourseId', CourseId)
      .input('Price', Price ? parseFloat(Price) : null)
      .input('SubjectId', SubjectId)
      .input('PublicationId', PublicationId)
      .input('TotalCopies', TotalCopies ? parseInt(TotalCopies) : null)
      .input('AvailableCopies', TotalCopies ? parseInt(TotalCopies) : null)
      .input('Edition', Edition || null)
      .input('Language', Language || null)
      .input('PublishedYear', PublishedYear ? parseInt(PublishedYear) : null)
      .input('ModifiedBy', ModifiedBy || 'admin')
      .input('ModifiedOn', new Date().toISOString())
      .input('BookPhoto', bookPhotoPath)
      .input('Barcode', Barcode || null)
      .input('AccessionNumber', AccessionNumber || null)
      .input('Source', Source || null)
      .query(`
        UPDATE Books SET
          IsbnNumber = @IsbnNumber, Title = @Title, Author = @Author, Details = @Details,
          CourseId = @CourseId, Price = @Price, SubjectId = @SubjectId, PublicationId = @PublicationId,
          TotalCopies = @TotalCopies, AvailableCopies = @AvailableCopies, Edition = @Edition,
          Language = @Language, PublishedYear = @PublishedYear, ModifiedBy = @ModifiedBy,
          ModifiedOn = @ModifiedOn, BookPhoto = @BookPhoto, Barcode = @Barcode,
          AccessionNumber = @AccessionNumber, Source = @Source
        WHERE BookId = @BookId
      `);

    logger.info(`Book updated successfully: ${Title}`);
    return NextResponse.json({ message: 'Book updated successfully' });
  } catch (error: any) {
    logger.error(`Error updating book: ${error.message}`, { stack: error.stack });
    return NextResponse.json({ 
      message: error.message || 'Internal server error',
      hint: error.message.includes('EPERM') ? 'Check IIS permissions for Books folder' : undefined
    }, { status: 500 });
  }
}

// DELETE method - book delete करने के लिए
export async function DELETE(req: NextRequest) {
  try {
    const { BookId } = await req.json();
    if (!BookId) {
      return NextResponse.json({ message: 'BookId is required' }, { status: 400 });
    }

    const pool = await getConnection();
    
    // Book का photo fetch करें
    const book = await pool.request()
      .input('BookId', BookId)
      .query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');

    // Photo delete करें अगर exists है
    if (book.recordset[0]?.BookPhoto) {
      const photoPath = path.join(process.cwd(), 'public', book.recordset[0].BookPhoto);
      try {
        await fs.unlink(photoPath);
        logger.info(`Photo deleted: ${book.recordset[0].BookPhoto}`);
      } catch (err) {
        logger.warn(`Could not delete photo: ${err}`);
      }
    }

    // Database से book delete करें
    await pool.request()
      .input('BookId', BookId)
      .query('DELETE FROM Books WHERE BookId = @BookId');

    logger.info(`Book deleted: ${BookId}`);
    return NextResponse.json({ message: 'Book deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting book: ${error}`, { stack: (error as Error).stack });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH method - book status change या image delete के लिए
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // Image delete action
    if (action === 'delete-image') {
      const { BookId, ModifiedBy } = await req.json();
      
      if (!BookId) {
        return NextResponse.json({ message: 'BookId is required' }, { status: 400 });
      }
      
      const pool = await getConnection();
      
      // Current book image get करें
      const book = await pool.request()
        .input('BookId', BookId)
        .query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');
        
      if (book.recordset.length === 0) {
        return NextResponse.json({ message: 'Book not found' }, { status: 404 });
      }
      
      const bookPhoto = book.recordset[0]?.BookPhoto;
      
      // Physical file delete करें
      if (bookPhoto) {
        const photoPath = path.join(process.cwd(), 'public', bookPhoto);
        try {
          await fs.unlink(photoPath);
          logger.info(`Image deleted from filesystem: ${bookPhoto}`);
        } catch (err) {
          logger.warn(`Could not delete image file: ${err}`);
        }
      }
      
      // Database में image reference remove करें
      await pool.request()
        .input('BookId', BookId)
        .input('ModifiedBy', ModifiedBy || 'system')
        .input('ModifiedOn', new Date().toISOString())
        .query(`
          UPDATE Books SET 
            BookPhoto = NULL,
            ModifiedBy = @ModifiedBy,
            ModifiedOn = @ModifiedOn
          WHERE BookId = @BookId
        `);
      
      logger.info(`Book image deleted: ${BookId}`);
      return NextResponse.json({ message: 'Image deleted successfully' });
    }
    
    // Book active/inactive toggle
    const { BookId, IsActive, ModifiedBy } = await req.json();

    if (!BookId || typeof IsActive !== 'boolean') {
      return NextResponse.json({ message: 'BookId and IsActive (true/false) are required' }, { status: 400 });
    }

    const pool = await getConnection();

    await pool.request()
      .input('BookId', BookId)
      .input('IsActive', IsActive)
      .input('ModifiedBy', ModifiedBy || 'system')
      .input('ModifiedOn', new Date().toISOString())
      .query(`
        UPDATE Books SET
          IsActive = @IsActive,
          ModifiedBy = @ModifiedBy,
          ModifiedOn = @ModifiedOn
        WHERE BookId = @BookId
      `);

    const statusText = IsActive ? 'activated' : 'deactivated';
    logger.info(`Book ${statusText}: ${BookId}`);

    return NextResponse.json({ message: `Book ${statusText} successfully` });
  } catch (error: any) {
    logger.error(`Error in PATCH operation: ${error.message}`, { stack: error.stack });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Helper function - FormData parse करने के लिए
async function parseFormData(req: NextRequest): Promise<{ body: { [key: string]: string }, file: File | null }> {
  const formData = await req.formData();
  const body: { [key: string]: string } = {};
  let file: File | null = null;
  
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      body[key] = value;
    } else if (key === 'BookPhoto' && value instanceof File && value.size > 0) {
      file = value;
    }
  }
  return { body, file };
}

// Helper function - File upload handle करने के लिए (improved with better error handling)
async function handleFileUpload(file: File): Promise<{ filename: string } | null> {
  try {
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      logger.error(`Invalid file type: ${file.type}`);
      throw new Error('Only JPEG, PNG, and GIF images are allowed');
    }

    // File size validation (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      logger.error(`File too large: ${file.size} bytes`);
      throw new Error('File size must be less than 5MB');
    }

    // Directory permission check करें
    await ensureUploadDir();
    
    // Unique filename generate करें
    const filename = await generateUniqueFilename(file.name);
    const filePath = path.join(uploadDir, filename);

    // File write करें with proper error handling
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await fs.writeFile(filePath, uint8Array);
      
      logger.info(`File saved successfully: ${filename}`);
      return { filename };
    } catch (writeError: any) {
      // यदि permission error आए तो specific message दें
      if (writeError.code === 'EPERM') {
        logger.error(`Permission denied writing file: ${writeError}`, {
          filePath: filePath,
          solution: 'Check IIS_IUSRS and IUSR permissions on Books folder'
        });
        throw new Error('Permission denied. Please check IIS folder permissions for Books directory.');
      }
      throw writeError;
    }
  } catch (error: any) {
    logger.error(`File upload failed: ${error.message}`, { 
      stack: error.stack,
      fileName: file.name,
      fileSize: file.size
    });
    
    // User-friendly error message return करें
    if (error.message.includes('Permission denied') || error.message.includes('EPERM')) {
      throw new Error('File upload failed due to server permissions. Please contact administrator.');
    }
    
    return null;
  }
}
