// Temporary test file to debug Firebase Storage
import { storage, auth } from '@/lib/firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function testFirebaseStorage() {
  try {
    console.log('=== FIREBASE STORAGE TEST ===');
    console.log('Storage object:', storage);
    console.log('Storage app:', storage.app);
    console.log('Storage bucket:', storage.app.options.storageBucket);
    console.log('Auth object:', auth);
    console.log('Current user:', auth.currentUser);
    
    // Test creating a reference
    const testRef = storageRef(storage, 'test/test-' + Date.now() + '.txt');
    console.log('Test reference created:', testRef.fullPath);
    console.log('Test reference bucket:', testRef.bucket);
    
    // Test uploading a simple text file
    const testData = new Blob(['Hello World from GuernseySpeaks test'], { type: 'text/plain' });
    console.log('Test data created:', testData);
    
    console.log('Attempting upload...');
    const uploadResult = await uploadBytes(testRef, testData);
    console.log('Upload successful:', uploadResult);
    console.log('Upload metadata:', uploadResult.metadata);
    
    const downloadURL = await getDownloadURL(testRef);
    console.log('Download URL:', downloadURL);
    
    return { 
      success: true, 
      url: downloadURL,
      bucket: testRef.bucket,
      path: testRef.fullPath
    };
  } catch (error) {
    console.error('=== FIREBASE STORAGE TEST FAILED ===');
    console.error('Error:', error);
    console.error('Error code:', (error as any)?.code);
    console.error('Error message:', (error as any)?.message);
    console.error('Error name:', (error as any)?.name);
    return { success: false, error, bucket: storage?.app?.options?.storageBucket };
  }
}