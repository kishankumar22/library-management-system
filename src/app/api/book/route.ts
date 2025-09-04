import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import path from 'path';
import fs from 'fs/promises';

// Configure upload directory
const uploadDir = path.join(process.cwd(), 'public/Books');

// Ensure the upload directory exists and is writable
async function ensureUploadDir() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    // Verify write permissions by creating a temporary file
    const testFilePath = path.join(uploadDir, '.test-write');
    await fs.writeFile(testFilePath, 'test');
    await fs.unlink(testFilePath);
    logger.info(`Upload directory ensured and writable: ${uploadDir}`);
  } catch (err) {
    logger.error(`Failed to ensure upload directory: ${err}`, { stack: (err as Error).stack });
    throw new Error(`Upload directory setup failed: ${err}`);
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

export async function POST(req: NextRequest) {
  try {
    await ensureUploadDir();
    const { body, file } = await parseFormData(req);
    const {
      IsbnNumber, Title, Author, Details, CourseId, Price, SubjectId, PublicationId,
      TotalCopies, Edition, Language, PublishedYear, CreatedBy, Barcode, AccessionNumber, Source
    } = body;

    // Validation
    if (!IsbnNumber || !Title) {
      return NextResponse.json({ message: 'ISBN and Title are required' }, { status: 400 });
    }
    if (!CourseId || !SubjectId || !PublicationId) {
      return NextResponse.json({ message: 'Course, Subject, and Publication are required' }, { status: 400 });
    }
    if (!IsbnNumber) {
     return NextResponse.json({ message: 'ISBN is required' }, { status: 400 });
    }

    if (Price && isNaN(parseFloat(Price))) {
      return NextResponse.json({ message: 'Invalid Price format' }, { status: 400 });
    }
    if (TotalCopies && isNaN(parseInt(TotalCopies))) {
      return NextResponse.json({ message: 'Invalid Total Copies' }, { status: 400 });
    }

    const pool = await getConnection();

    let bookPhotoPath = null;
    if (file && file.size > 0) {
      const uploadResult = await handleFileUpload(file);
      if (uploadResult) {
        bookPhotoPath = `/Books/${uploadResult.filename}`;
        logger.info(`File uploaded successfully: ${uploadResult.filename}`);
      }
    }

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
    logger.error(`Error adding book: ${error.message}`, { stack: error.stack });
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureUploadDir();
    const formData = await req.formData();

    let body: { [key: string]: string } = {};
    let file: File | null = null;
    
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
  if (!IsbnNumber) {
  return NextResponse.json({ message: 'ISBN is required' }, { status: 400 });
}

    if (Price && isNaN(parseFloat(Price))) {
      return NextResponse.json({ message: 'Invalid Price format' }, { status: 400 });
    }
    if (TotalCopies && isNaN(parseInt(TotalCopies))) {
      return NextResponse.json({ message: 'Invalid Total Copies' }, { status: 400 });
    }

    const pool = await getConnection();

    // Fetch existing book to get current BookPhoto
    const existingBookResult = await pool.request()
      .input('BookId', BookId)
      .query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');
    
    if (existingBookResult.recordset.length === 0) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 });
    }

    let bookPhotoPath = existingBookResult.recordset[0]?.BookPhoto || null;

    // Handle new file upload
    if (file) {
      const uploadResult = await handleFileUpload(file);
      if (uploadResult) {
        // Delete old photo if it exists and new upload is successful
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
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { BookId } = await req.json();
    if (!BookId) {
      return NextResponse.json({ message: 'BookId is required' }, { status: 400 });
    }

    const pool = await getConnection();
    const book = await pool.request()
      .input('BookId', BookId)
      .query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');

    if (book.recordset[0]?.BookPhoto) {
      const photoPath = path.join(process.cwd(), 'public', book.recordset[0].BookPhoto);
      try {
        await fs.unlink(photoPath);
        logger.info(`Photo deleted: ${book.recordset[0].BookPhoto}`);
      } catch (err) {
        logger.warn(`Could not delete photo: ${err}`);
      }
    }

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

export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'delete-image') {
      const { BookId, ModifiedBy } = await req.json();
      
      if (!BookId) {
        return NextResponse.json({ message: 'BookId is required' }, { status: 400 });
      }
      
      const pool = await getConnection();
      
      // Get current book image
      const book = await pool.request()
        .input('BookId', BookId)
        .query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');
        
      if (book.recordset.length === 0) {
        return NextResponse.json({ message: 'Book not found' }, { status: 404 });
      }
      
      const bookPhoto = book.recordset[0]?.BookPhoto;
      
      // Delete physical file if exists
      if (bookPhoto) {
        const photoPath = path.join(process.cwd(), 'public', bookPhoto);
        try {
          await fs.unlink(photoPath);
          logger.info(`Image deleted from filesystem: ${bookPhoto}`);
        } catch (err) {
          logger.warn(`Could not delete image file: ${err}`);
        }
      }
      
      // Update database to remove image reference
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
    
    // Existing toggle active logic
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

async function handleFileUpload(file: File): Promise<{ filename: string } | null> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      logger.error(`Invalid file type: ${file.type}`);
      throw new Error('Only JPEG, PNG, and GIF images are allowed');
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      logger.error(`File too large: ${file.size} bytes`);
      throw new Error('File size must be less than 5MB');
    }

    await ensureUploadDir();
    
    // Generate unique filename
    const filename = await generateUniqueFilename(file.name);
    const filePath = path.join(uploadDir, filename);

    // Write file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await fs.writeFile(filePath, uint8Array);

    logger.info(`File saved: ${filename}`);
    return { filename };
  } catch (error) {
    logger.error(`File upload failed: ${error}`, { stack: (error as Error).stack });
    return null;
  }
}
