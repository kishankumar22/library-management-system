import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Configure Multer for file uploads with unique naming
const uploadDir = path.join(process.cwd(), 'public/Books');
fs.mkdir(uploadDir, { recursive: true }).catch(err => logger.error(`Failed to create directory: ${err}`));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    let uniqueName = baseName;
    let counter = 1;

    const checkFile = async () => {
      const filePath = path.join(uploadDir, `${uniqueName}${ext}`);
      try {
        await fs.access(filePath);
        uniqueName = `${baseName}(${counter})`;
        counter++;
        await checkFile();
      } catch {
        cb(null, `${uniqueName}${ext}`);
      }
    };

    checkFile();
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and GIF images are allowed'));
    }
    cb(null, true);
  },
});

// Middleware to handle multipart/form-data (kept for compatibility)
const uploadMiddleware = upload.single('BookPhoto');

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to allow manual handling
  },
};

const runMiddleware = (req: NextRequest, res: NextResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req as any, res as any, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
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
      WHERE (b.Title LIKE @search OR b.IsbnNumber LIKE @search)
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
    logger.error(`Error fetching books: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await runMiddleware(req, NextResponse.next(), uploadMiddleware);
    logger.info('POST Middleware executed, file:', (req as any).file);

    const body = await parseFormData(req);
    const {
      IsbnNumber, Title, Author, Details, CourseId, Price, SubjectId, PublicationId,
      TotalCopies, Edition, Language, PublishedYear, CreatedBy, Barcode
    } = body;

    // Validation
    if (!IsbnNumber || !Title) {
      return NextResponse.json({ message: 'ISBN and Title are required' }, { status: 400 });
    }
    if (!CourseId || !SubjectId || !PublicationId) {
      return NextResponse.json({ message: 'Course, Subject, and Publication are required' }, { status: 400 });
    }
    if (!/^\d{10,13}$/.test(IsbnNumber)) {
      return NextResponse.json({ message: 'Invalid ISBN format' }, { status: 400 });
    }
    if (Price && isNaN(parseFloat(Price))) {
      return NextResponse.json({ message: 'Invalid Price format' }, { status: 400 });
    }
    if (TotalCopies && isNaN(parseInt(TotalCopies))) {
      return NextResponse.json({ message: 'Invalid Total Copies' }, { status: 400 });
    }

    const pool = await getConnection();

    const checkResult = await pool.request()
      .input('IsbnNumber', IsbnNumber)
      .query('SELECT * FROM Books WHERE IsbnNumber = @IsbnNumber');
    if (checkResult.recordset.length > 0) {
      return NextResponse.json({ message: 'Book with this ISBN already exists' }, { status: 400 });
    }

    let bookPhotoPath = '';
    const file = (req as any).file;
    if (file) {
      bookPhotoPath = `/Books/${file.filename}`;
      logger.info(`File saved at: ${bookPhotoPath}`);
    } else {
      logger.warn('No file uploaded');
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
      .query(`
        INSERT INTO Books (
          IsbnNumber, Title, Author, Details, CourseId, Price, SubjectId, PublicationId,
          TotalCopies, AvailableCopies, Edition, Language, PublishedYear, CreatedBy, BookPhoto, Barcode
        ) VALUES (
          @IsbnNumber, @Title, @Author, @Details, @CourseId, @Price, @SubjectId, @PublicationId,
          @TotalCopies, @AvailableCopies, @Edition, @Language, @PublishedYear, @CreatedBy, @BookPhoto, @Barcode
        )
      `);

    logger.info(`Book added: ${Title}`);
    return NextResponse.json({ message: 'Book added successfully' });
  } catch (error: any) {
    logger.error(`Error adding book: ${error.message}`);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData(); // Process FormData directly
    logger.info('PUT FormData processed');

    let body: { [key: string]: string } = {};
    let file: File | null = null;
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        body[key] = value;
      } else if (key === 'BookPhoto' && value instanceof File) {
        file = value;
        logger.info(`File detected in formData: ${file.name}`);
      }
    }

    const {
      BookId, IsbnNumber, Title, Author, Details, CourseId, Price, SubjectId, PublicationId,
      TotalCopies, Edition, Language, PublishedYear, ModifiedBy, Barcode
    } = body;

    // Validation
    if (!BookId || !IsbnNumber || !Title) {
      return NextResponse.json({ message: 'BookId, ISBN, and Title are required' }, { status: 400 });
    }
    if (!CourseId || !SubjectId || !PublicationId) {
      return NextResponse.json({ message: 'Course, Subject, and Publication are required' }, { status: 400 });
    }
    if (!/^\d{10,13}$/.test(IsbnNumber)) {
      return NextResponse.json({ message: 'Invalid ISBN format' }, { status: 400 });
    }
    if (Price && isNaN(parseFloat(Price))) {
      return NextResponse.json({ message: 'Invalid Price format' }, { status: 400 });
    }
    if (TotalCopies && isNaN(parseInt(TotalCopies))) {
      return NextResponse.json({ message: 'Invalid Total Copies' }, { status: 400 });
    }

    const pool = await getConnection();

    let bookPhotoPath = body.BookPhoto || '';
    if (file) {
      const uploadResult = await handleManualFileUpload(file);
      if (uploadResult) {
        bookPhotoPath = `/Books/${uploadResult.filename}`;
        logger.info(`New file saved at: ${bookPhotoPath}`);
        const oldBook = await pool.request().input('BookId', BookId).query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');
        if (oldBook.recordset[0]?.BookPhoto) {
          const oldPhotoPath = path.join(process.cwd(), 'public', oldBook.recordset[0].BookPhoto);
          await fs.unlink(oldPhotoPath).catch(err => logger.error(`Failed to delete old photo: ${err}`));
        }
      } else {
        logger.warn('File upload failed, keeping existing photo');
      }
    } else {
      logger.warn('No new file uploaded for update, keeping existing:', body.BookPhoto);
      const existingBook = await pool.request().input('BookId', BookId).query('SELECT BookPhoto FROM Books WHERE BookId = @BookId');
      bookPhotoPath = existingBook.recordset[0]?.BookPhoto || '';
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
      .input('BookPhoto', bookPhotoPath || null)
      .input('Barcode', Barcode || null)
      .query(`
        UPDATE Books SET
          IsbnNumber = @IsbnNumber, Title = @Title, Author = @Author, Details = @Details,
          CourseId = @CourseId, Price = @Price, SubjectId = @SubjectId, PublicationId = @PublicationId,
          TotalCopies = @TotalCopies, AvailableCopies = @AvailableCopies, Edition = @Edition,
          Language = @Language, PublishedYear = @PublishedYear, ModifiedBy = @ModifiedBy,
          ModifiedOn = @ModifiedOn, BookPhoto = @BookPhoto, Barcode = @Barcode
        WHERE BookId = @BookId
      `);

    logger.info(`Book updated: ${Title}`);
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
      await fs.unlink(photoPath).catch(err => logger.error(`Failed to delete photo: ${err}`));
    }

    await pool.request()
      .input('BookId', BookId)
      .query('DELETE FROM Books WHERE BookId = @BookId');

    logger.info(`Book deleted: ${BookId}`);
    return NextResponse.json({ message: 'Book deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting book: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { BookId, IsActive } = await req.json();
    if (!BookId || IsActive === undefined) {
      return NextResponse.json({ message: 'BookId and IsActive are required' }, { status: 400 });
    }

    const pool = await getConnection();
    await pool.request()
      .input('BookId', BookId)
      .input('IsActive', IsActive)
      .input('ModifiedBy', 'admin')
      .input('ModifiedOn', new Date().toISOString())
      .query(`
        UPDATE Books SET
          IsActive = @IsActive,
          ModifiedBy = @ModifiedBy,
          ModifiedOn = @ModifiedOn
        WHERE BookId = @BookId
      `);

    logger.info(`Book ${IsActive ? 'activated' : 'deactivated'}: ${BookId}`);
    return NextResponse.json({ message: `Book ${IsActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    logger.error(`Error toggling book status: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to parse form data
async function parseFormData(req: NextRequest): Promise<{ [key: string]: string }> {
  const formData = await req.formData();
  const body: { [key: string]: string } = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      body[key] = value;
    } else if (key === 'BookPhoto' && value instanceof File) {
      logger.info(`File detected in formData: ${value.name}`);
    }
  }
  return body;
}

// Manual file upload function
async function handleManualFileUpload(file: File): Promise<{ filename: string } | null> {
  try {
    const ext = path.extname(file.name);
    const baseName = path.basename(file.name, ext);
    let uniqueName = baseName;
    let counter = 1;

    const checkFile = async () => {
      const filePath = path.join(uploadDir, `${uniqueName}${ext}`);
      try {
        await fs.access(filePath);
        uniqueName = `${baseName}(${counter})`;
        counter++;
        await checkFile();
      } catch {
        return { filename: `${uniqueName}${ext}` };
      }
    };

    const result = await checkFile();
    if (result) {
      const filePath = path.join(uploadDir, result.filename);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await fs.writeFile(filePath, uint8Array);
      logger.info(`Manually saved file at: ${filePath}`);
      return result;
    }
    return null;
  } catch (error) {
    logger.error(`Error in manual file upload: ${error}`);
    return null;
  }
}