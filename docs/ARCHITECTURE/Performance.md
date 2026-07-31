# Performance

## Guidelines

- Paginate large booking lists.  
- Avoid shipping heavy map stacks on routes that do not need them (code-split where practical).  
- Prefer server aggregation for analytics as data volume grows.  
- Cache static geo assets sensibly.  

## Current notes

- Reports can use live or mock data toggles—ensure production defaults to live.  
- Large exports should remain asynchronous or chunked as volume grows (**Future Vision**).
