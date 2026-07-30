# Error Handling

Prefer JSON:

```json
{ "error": "Human message", "code": "MACHINE_CODE" }
```

**Approved Direction** for package denials:

```json
{
  "error": "Feature requires a higher package",
  "code": "UPGRADE_REQUIRED",
  "requiredPackage": "growth",
  "recommendedPackage": "growth"
}
```
