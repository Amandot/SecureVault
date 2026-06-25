import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const BUCKET = 'encrypted-files';

let bucketReady: Promise<void> | null = null;

/**
 * Ensure the encrypted-files bucket exists (created once on first use).
 */
export const ensureStorageBucket = async (): Promise<void> => {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        throw new Error(`Failed to list storage buckets: ${listError.message}`);
      }

      if (!buckets?.some((b) => b.name === BUCKET)) {
        const { error: createError } = await supabase.storage.createBucket(BUCKET, {
          public: false,
        });
        if (createError && !createError.message.toLowerCase().includes('already exists')) {
          throw new Error(`Failed to create storage bucket: ${createError.message}`);
        }
      }
    })();
  }

  await bucketReady;
};

/**
 * Upload an encrypted buffer to Supabase Storage.
 * The backend handles the upload using the Service Role Key.
 */
export const uploadEncryptedFile = async (
  buffer: Buffer,
  mimeType: string = 'application/octet-stream'
): Promise<string> => {
  await ensureStorageBucket();

  const storagePath = `encrypted/${uuidv4()}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/octet-stream', // never reveal original mime type
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  return storagePath; // The unique path in the bucket
};

/**
 * Generate a signed GET URL for downloading an encrypted file from Supabase Storage.
 * Short expiry to prevent link sharing.
 */
export const createSignedDownloadUrl = async (
  storagePath: string,
  expiresIn = 300 // 5 minutes
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
};

/**
 * Delete an encrypted file from Supabase Storage.
 */
export const deleteEncryptedFile = async (storagePath: string): Promise<void> => {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete file from Supabase: ${error.message}`);
  }
};

/**
 * Check if a file exists in Supabase Storage.
 */
export const fileExists = async (storagePath: string): Promise<boolean> => {
  // Create a signed url with a very short expiration (e.g. 1 second) to test if the file is reachable
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 1);
  if (error) return false;
  return true;
};
