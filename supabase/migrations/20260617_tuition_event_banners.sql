ALTER TABLE tuition_events
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMENT ON COLUMN tuition_events.banner_url IS 'Public poster or banner image URL used on landing and admin event cards.';



Failed to upload voice note to storage. Please ensure "voice_notes" bucket exists and is public. Error [StorageApiError]: Bucket not found
    at <unknown> (C:\Users\Githinji\peak-Tuitioning\.next\server\chunks\ssr\_0vqw1~x._.js:27:17559) {
  __isStorageError: true,
  namespace: 'storage',
  status: 400,
  statusCode: '404'