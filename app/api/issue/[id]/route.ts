import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import admin from "firebase-admin";


if (!admin.apps.length) {
    try {
        const serviceAccount = require("@/serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

// Helper function to verify if user is a housekeeping staff
async function verifyHousekeepingStaff(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  try {
    // Verify the token
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Check if user exists in housekeeping-staffs collection
    const housekeepingDoc = await db.collection('housekeeping-staffs').doc(uid).get();
    
    return housekeepingDoc.exists;
  } catch (error) {
    console.error('Error verifying housekeeping staff:', error);
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const issueId = params.id;
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    
    // Check if the user is a housekeeping staff
    const isHousekeepingStaff = await verifyHousekeepingStaff(token);
    
    if (!isHousekeepingStaff) {
      return NextResponse.json(
        { error: 'Unauthorized: Only housekeeping staff can update issues' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    const { solved } = data;
    
    if (solved === undefined) {
      return NextResponse.json(
        { error: 'Bad request: Missing required fields' },
        { status: 400 }
      );
    }
    
    // Update the issue in Firestore
    const issueRef = db.collection('maintenanceIssues').doc(issueId);
    const issueDoc = await issueRef.get();
    
    if (!issueDoc.exists) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }
    
    await issueRef.update({
      solved,
      resolvedAt: solved ? new Date().toISOString() : null,
      resolvedBy: solved ? token : null,
    });
    
    return NextResponse.json(
      { message: 'Issue updated successfully', issueId },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
