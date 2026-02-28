-- Fix installer_bids.installer_id: was pointing to auth.users (unusable by PostgREST)
-- SendBidToInstaller.tsx uses: .select('*, installer:installer_id(id, name)')
ALTER TABLE installer_bids DROP CONSTRAINT installer_bids_installer_id_fkey;
ALTER TABLE installer_bids
  ADD CONSTRAINT installer_bids_installer_id_fkey
    FOREIGN KEY (installer_id) REFERENCES profiles(id) ON DELETE SET NULL;
