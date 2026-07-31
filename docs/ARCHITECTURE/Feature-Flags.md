# Feature Flags & Visibility

FastCheckIn uses **product visibility** states more than a classic flag service today.

## Visibility states

Internal · Prototype · Beta · Preview · Visible · Locked · Released · Deprecated  

See [PRODUCT/Product-Specification.md](../PRODUCT/Product-Specification.md).

## Current Implementation

- No dedicated feature-flag SaaS.  
- Behaviour toggles sometimes local (e.g. demo data on Reports).  

## Approved Direction

- Registry-driven visibility.  
- Entitlements for temporary unlocks.  
- Environment-based flags only for infra (not commercial packages).
