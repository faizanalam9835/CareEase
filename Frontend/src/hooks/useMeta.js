import { useState, useEffect } from 'react';
import { metaService } from '../services';

/**
 * Enumerations (departments, blood groups, statuses…) come from the API so the
 * dropdowns can never offer a value the server would reject. The old code
 * hard-coded its own lists, which is why the patient form offered departments
 * such as "Oncology" that the backend enum did not accept.
 *
 * The result is cached for the lifetime of the tab - these values do not change
 * while someone is using the app.
 */
const FALLBACK = {
  roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST'],
  departments: [
    'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Neurology',
    'Dermatology', 'Oncology', 'Emergency', 'Pharmacy', 'Administration', 'General'
  ],
  clinicalDepartments: [
    'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Neurology',
    'Dermatology', 'Oncology', 'Emergency', 'General'
  ],
  bloodGroups: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
  genders: ['Male', 'Female', 'Other'],
  patientTypes: ['OPD', 'IPD'],
  patientStatuses: ['Active', 'Inactive', 'Discharged', 'Deceased'],
  appointmentTypes: ['OPD', 'Follow-up', 'Consultation', 'Emergency'],
  appointmentStatuses: [
    'Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'
  ],
  medicineCategories: [
    'Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Other'
  ],
  invoiceItemTypes: ['Consultation', 'Medicine', 'Test', 'Procedure', 'Room', 'Other'],
  paymentStatuses: ['Pending', 'Paid', 'Partially_Paid', 'Cancelled', 'Refunded'],
  paymentMethods: ['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Other'],
  prescriptionStatuses: ['Active', 'Completed', 'Cancelled'],
  pharmacyStatuses: ['Pending', 'Dispensed', 'Partially_Dispensed', 'Cancelled'],
  wardTypes: [
    'General', 'Semi-Private', 'Private', 'ICU', 'ICCU', 'NICU', 'Emergency', 'Maternity'
  ],
  bedStatuses: ['Available', 'Occupied', 'Reserved', 'Maintenance']
};

let cache = null;
let inFlight = null;

export const useMeta = () => {
  const [meta, setMeta] = useState(cache || FALLBACK);
  const [ready, setReady] = useState(Boolean(cache));

  useEffect(() => {
    if (cache) return;

    inFlight = inFlight || metaService.get();
    let cancelled = false;

    inFlight
      .then((data) => {
        cache = { ...FALLBACK, ...data.meta };
        if (!cancelled) {
          setMeta(cache);
          setReady(true);
        }
      })
      // The hard-coded fallback keeps the forms usable if /api/meta is down.
      .catch(() => !cancelled && setReady(true))
      .finally(() => {
        inFlight = null;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { meta, ready };
};

export default useMeta;
