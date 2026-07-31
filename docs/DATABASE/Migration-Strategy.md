# Migration Strategy

1. Design change + Product Decision if commercial.  
2. Apply migration in Supabase (versioned).  
3. Update [Table-Descriptions.md](./Table-Descriptions.md).  
4. Deploy functions compatible with dual-read if needed.  
5. Remove dual-write after verification.  
