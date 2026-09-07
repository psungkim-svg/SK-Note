# soonenote v6.5 deployment notes

## Files
- Deploy `app_v6.5.html` as the site's `index.html` (keep the versioned copy for download/history only).
- Deploy `sw.js`.
- Deploy `vendor/supabase.min.js` at that exact path.
- Keep the existing `manifest.webmanifest` and `icons/` files from the repository; they were not included in the supplied attachments.
- Deploy `account-deletion.html` and enter its public URL in Play Console.

## Account deletion server function
The client never contains the service-role key. Deploy the included authenticated Edge Function:

```bash
supabase functions deploy delete-account
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. Confirm this in the project before testing.

Test with a disposable account and verify that the user plus rows in `notes` and `folders` are deleted. If additional user-owned tables are added later, update the function before release.

## Required checks
- Confirm RLS is enabled in the real Supabase project.
- Test sign-up, sign-in, sync, sign-out, password reset, and deletion with two separate users.
- Verify one user cannot read, update, or delete the other user's rows.
- Test encrypted Vault backup and restore with a disposable Vault.
- Replace the application's privacy policy/contact information before Play submission; this package does not invent operator details.
