-- Phone system: add per-agent extensions + update hold music to bensound

-- Each agent can have a short extension (e.g. "101", "102")
ALTER TABLE phone_agents ADD COLUMN IF NOT EXISTS extension text;

-- Update default hold music URL to royalty-free bensound track
ALTER TABLE phone_system
  ALTER COLUMN hold_music_url
  SET DEFAULT 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3';

-- Update any existing rows still using the old Twilio S3 default or null
UPDATE phone_system
SET hold_music_url = 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3'
WHERE hold_music_url IS NULL
   OR hold_music_url = 'https://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3';
