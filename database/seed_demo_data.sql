-- Seed more data for Demo

-- Insert some historical claims for customer 101 (Suyash) under Policy 1001
INSERT INTO Claims (policy_id, hospital_id, disease, claim_amount, status, claim_date, doctor_name) VALUES
(1001, 1, 'Appendicitis', 45000.00, 'Approved', '2026-05-15', 'Dr. Sharma'),
(1001, 2, 'Dental Caries', 5000.00, 'Rejected', '2026-06-20', 'Dr. Patil')
ON CONFLICT DO NOTHING;

-- Sync sequences just in case
SELECT setval(pg_get_serial_sequence('claims',       'claim_id'),    MAX(claim_id))       FROM Claims;
