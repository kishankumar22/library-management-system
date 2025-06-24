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
  id: number;
  name: string;
  isActive: boolean;
}

export interface BookIssue {
  id: number;
  studentId: number;
  bookId: number;
  issueDate: Date;
  dueDate: Date;
  returnDate?: Date;
  penalty?: number;
}