---
name: marketplace-booking-engine
description: "Architecture and implementation patterns for wellness & sports marketplace booking engines: availability calculation, geo-radius filtering, travel-time matrix buffers between appointments, automated venue/gym space matching, 4-way split fee checkouts (X+Z+Y+W), and concurrency locks to prevent double-booking."
metadata:
  version: "1.0.0"
---

# Marketplace Booking & Availability Engine

Use this skill when designing or implementing the core booking, search, scheduling, geo-routing, and split-payment checkout flows for the professionals, clients, and spaces platform.

## 1. Domain Entities & Roles

The system coordinates four primary roles:
- **Client (Cliente)**: Discovers services, selects slots, pays in a single consolidated checkout, and attends sessions.
- **Professional (Profesional)**: Configures base location, maximum travel radius (km), max travel time between sessions, calendar buffer, services, and modalities (own space, client home, gym, external studio, online).
- **Space Manager (Gestor de Espacio)**: Manages physical inventory (gyms, studios, consult rooms), capacities, equipment, hourly rates, and check-in instructions.
- **Platform Admin (Administración)**: Oversees disputes, platform commissions, payouts, verification, and audit logs.

## 2. Availability & Geo-Routing Engine

### The Scheduling Condition (Hard Invariant)
A candidate slot `[T_start, T_end]` at location `L_candidate` is viable for a professional if and only if:
1. **No direct calendar overlap** with existing appointments or blocked intervals.
2. **Backward Travel Feasibility**:
   `T_start >= Prev_End + TravelTime(Prev_Location, L_candidate) + Buffer_Time`
3. **Forward Travel Feasibility**:
   `T_end + TravelTime(L_candidate, Next_Location) + Buffer_Time <= Next_Start`
4. **Radius Constraint**:
   `Distance(Professional_Base_Location, L_candidate) <= Max_Radius_KM`

*Note: The client never sees the professional's other appointment locations or private schedule; only viable computed slots are returned.*

### Automated Space / Gym Matching
When a service requires an external venue:
- Filter spaces where `Distance(L_space, Preferred_Client_Area) <= Threshold` AND `Distance(Professional_Base, L_space) <= Professional_Max_Radius`.
- Verify required equipment (e.g., reformer, functional rig, massage table) and minimum capacity.
- Concurrently verify space availability for the exact slot.

## 3. Financial Model & Single Checkout (4-Way Split)

Every checkout presents an itemized single total:
`Total Checkout = X (Service Fee) + Z (Platform Service Fee) + Y (Space Fee) + W (Platform Space Fee)`

- **Professional Service (X)**: Goes to professional payout (via Stripe Connect Custom/Express).
- **Service Commission (Z)**: Retained by platform as application fee.
- **Space / Room Rental (Y)**: Goes to Space Manager account. If first gym entry promo applies for new client, `Y = 0.00 €`.
- **Space Commission (W)**: Platform fee on space rental (0 if space is 0).

### Instant Confirmation & Idempotency
- When payment succeeds (`payment_intent.succeeded` webhook), the platform immediately:
  1. Marks booking as `CONFIRMED`.
  2. Commits schedule hold for professional.
  3. Commits room reservation in space inventory.
  4. Deducts group capacity / generates ticket.
- No manual professional approval step: "The schedule rules, payment confirms."

## 4. Concurrency & Double-Booking Prevention

### Slot Hold (Pessimistic / Distributed Lock)
During checkout (TTL = 10 minutes):
```sql
-- Acquire row lock on slot or space inventory
SELECT id, status, capacity, booked_count 
FROM session_slots 
WHERE id = :slot_id 
FOR UPDATE;

-- Validate availability
IF booked_count + :requested_seats <= capacity THEN
  INSERT INTO booking_holds (slot_id, client_id, expires_at) 
  VALUES (:slot_id, :client_id, NOW() + INTERVAL '10 minutes');
END IF;
```
If checkout expires or fails, webhooks or a scheduled sweeper release the hold immediately.

## 5. Group Sessions, Capacity & Waitlist
- A group class has a fixed `max_capacity`.
- Multiple seats can be purchased in a single checkout.
- If full, clients can join a non-monetized waitlist.
- On cancellation: next waitlisted client receives a time-limited claim window (e.g. 30 mins) before passing to next.
