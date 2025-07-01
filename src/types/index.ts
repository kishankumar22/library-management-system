import { ReactNode } from "react";

// library-management-system/src/types/index.ts
export interface User {
  user_id: number;
  name: string;
  email: string;
  mobileNo: string;
  password: string;
  roleId: number;
  created_on: Date;
  created_by: number;
  modify_on?: Date;
  modify_by?: number;
  profile_pic_url?: string;
  profile_pic_public_id?: string;
}

export interface Student {
  [x: string]: any;
  courseYear: boolean;
  id: number;
  stdCollId: string;
  fName: string;
  lName: string;
  rollNumber: string;
  gender: string;
  fatherName: string;
  motherName: string;
  mobileNumber: string;
  fatherMobile: string;
  alternateNumber?: string;
  dob: Date;
  email: string;
  address: string;
  state: string;
  pincode: string;
  city: string;
  admissionMode: string;
  collegeId: number;
  courseId: number;
  admissionDate: Date;
  studentImage?: string;
  category: string;
  isDiscontinue: boolean;
  isLateral: boolean;
  discontinueOn?: Date;
  discontinueBy?: number;
  createdBy: number;
  createdOn: Date;
  modifiedBy?: number;
  modifiedOn?: Date;
  status: string;
}

export interface Subject {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Publication {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  publicationId: number;
  subjectId: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface Course {
  [x: string]: ReactNode;
  id: number;
  name: string;
  isActive: boolean;
}

export interface BookIssue {
  [x: string]: any;
  IssueId: any;
  id: number;
  studentId: number;
  bookId: number;
  issueDate: Date;
  dueDate: Date;
  returnDate?: Date;
  penalty?: number;
}
export interface Book {
  BookId: number;
  IsbnNumber: string;
  Title: string;
  Barcode: string | null;
  Author: string | null;
  BookPhoto: string | null;
  Details: string | null;
  CourseId: number | null;
  courseName: string | null;
  Price: number | null;
  SubjectId: number | null;
  SubjectName: string | null;
  PublicationId: number | null;
  PublicationName: string | null;
  IsAvailable: boolean;
  TotalCopies: number;
  AvailableCopies: number;
  Edition: string | null;
  Language: string | null;
  PublishedYear: number | null;
  IsActive: boolean;
  CreatedBy: string;
  CreatedOn: string;
  ModifiedBy: string | null;
  ModifiedOn: string | null;
}


 export interface Subject {
  SubId: number;
  Name: string;
  IsActive: boolean;
  CreatedBy: string;
  CreatedOn: string;
  ModifiedBy?: string;
  ModifiedOn?: string;
}

export interface Publication {
  PubId: number;
  Name: string;
  IsActive: boolean;
  CreatedBy: string;
  CreatedOn: string;
  ModifiedBy?: string;
  ModifiedOn?: string;
}
export interface BookStockHistory {
  BookStockHistoryId: number;
  BookId: number;
  BookName: string;
  PublicationName: string;
  CopiesAdded: number;
  Remarks: string;
  CreatedOn: Date;
  CreatedBy: string;
  ModifiedOn: Date;
  ModifiedBy: string;
}
