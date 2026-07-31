# Scalability

## Dimensions

| Dimension | Approach |
|-----------|----------|
| Bookings volume | Indexes, pagination, archival jobs (`archive-old-bookings`) |
| Properties | Establishments model (Business+) |
| Staff | Seat limits per package |
| API consumers | Enterprise API with auth & rate limits (**Future**) |
| AI cost | Tiered AI features |

## Multi-tenant isolation

Strict `business_id` (and future `establishment_id`) on all queries.
