# Fast Check-In

| Field | Value |
|-------|--------|
| **Purpose** | Digitise guest arrival: details, ID, signature, consent |
| **Business value** | Compliance + speed at reception |
| **Customer value** | Less paper, professional arrival |
| **Package** | Starter |
| **Visibility** | Released |
| **Status** | Implemented |

## User stories

- As a guest, I can complete check-in on my phone via link/QR.  
- As reception, I can see completed check-ins without retyping forms.  

## Dependencies

Business branding/settings · booking create APIs · i18n  

## Screens / components

`DynamicCheckIn`, `components/checkin/*`, `hooks/useCheckIn.ts`  

## APIs

`create-booking` and related confirmation functions  

## Future

Faster returning-guest flows; kiosk mode polish.
