-- Doctor Mitra / TapCure — full schema generated from the SQLAlchemy models.
-- Run once against a fresh Postgres DB:  psql "<DATABASE_URL>" -f schema.sql
-- NOTE: creates tables only (no data). Start the app with SEED_ON_STARTUP=true
--       to seed RBAC + demo tenant, OR use `alembic upgrade head` instead.

CREATE TABLE hospitals (
	hospital_id BIGSERIAL NOT NULL, 
	name VARCHAR(150) NOT NULL, 
	short_code VARCHAR(20) NOT NULL, 
	address TEXT NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	state VARCHAR(100) NOT NULL, 
	pincode VARCHAR(10) NOT NULL, 
	phone VARCHAR(20) NOT NULL, 
	email VARCHAR(100) NOT NULL, 
	logo_url VARCHAR(255), 
	gstin VARCHAR(20), 
	hfr_id VARCHAR(64), 
	latitude NUMERIC(9, 6), 
	longitude NUMERIC(9, 6), 
	status VARCHAR(12) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (hospital_id)
);
CREATE INDEX ix_hospitals_status ON hospitals (status);
CREATE UNIQUE INDEX ix_hospitals_short_code ON hospitals (short_code);
CREATE INDEX ix_hospitals_hfr_id ON hospitals (hfr_id);

CREATE TABLE permissions (
	permission_id BIGSERIAL NOT NULL, 
	module VARCHAR(50) NOT NULL, 
	action VARCHAR(50) NOT NULL, 
	description TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (permission_id), 
	CONSTRAINT uq_permission_module_action UNIQUE (module, action)
);
CREATE INDEX ix_permissions_module ON permissions (module);

CREATE TABLE plans (
	plan_id BIGSERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	price_monthly NUMERIC(8, 2) NOT NULL, 
	price_annually NUMERIC(8, 2) NOT NULL, 
	max_doctors INTEGER NOT NULL, 
	max_departments INTEGER NOT NULL, 
	max_tokens_per_day INTEGER NOT NULL, 
	sms_quota_monthly INTEGER NOT NULL, 
	whatsapp_enabled BOOLEAN NOT NULL, 
	reports_enabled BOOLEAN NOT NULL, 
	api_access_enabled BOOLEAN NOT NULL, 
	features_json JSON, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (plan_id)
);

CREATE TABLE roles (
	role_id BIGSERIAL NOT NULL, 
	name VARCHAR(50) NOT NULL, 
	description TEXT NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (role_id)
);
CREATE UNIQUE INDEX ix_roles_name ON roles (name);

CREATE TABLE departments (
	department_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	description TEXT NOT NULL, 
	floor VARCHAR(50) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (department_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);
CREATE INDEX ix_departments_hospital_id ON departments (hospital_id);

CREATE TABLE hospital_settings (
	setting_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	op_start_time TIME WITHOUT TIME ZONE NOT NULL, 
	op_end_time TIME WITHOUT TIME ZONE NOT NULL, 
	lunch_start TIME WITHOUT TIME ZONE, 
	lunch_end TIME WITHOUT TIME ZONE, 
	token_prefix VARCHAR(10) NOT NULL, 
	booking_fee NUMERIC(8, 2) NOT NULL, 
	consultation_duration INTEGER NOT NULL, 
	max_advance_days INTEGER NOT NULL, 
	emergency_enabled BOOLEAN NOT NULL, 
	sms_enabled BOOLEAN NOT NULL, 
	whatsapp_enabled BOOLEAN NOT NULL, 
	timezone VARCHAR(50) NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (setting_id), 
	UNIQUE (hospital_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);

CREATE TABLE monthly_reports (
	report_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	month INTEGER NOT NULL, 
	year INTEGER NOT NULL, 
	total_tokens INTEGER NOT NULL, 
	unique_patients INTEGER NOT NULL, 
	new_patients INTEGER NOT NULL, 
	total_revenue NUMERIC(12, 2) NOT NULL, 
	avg_daily_tokens NUMERIC(6, 2) NOT NULL, 
	no_show_rate NUMERIC(5, 2) NOT NULL, 
	cancellation_rate NUMERIC(5, 2) NOT NULL, 
	generated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (report_id), 
	CONSTRAINT uq_monthly_report UNIQUE (hospital_id, month, year), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);
CREATE INDEX ix_monthly_reports_hospital_id ON monthly_reports (hospital_id);

CREATE TABLE role_permissions (
	id BIGSERIAL NOT NULL, 
	role_id BIGINT NOT NULL, 
	permission_id BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id), 
	FOREIGN KEY(role_id) REFERENCES roles (role_id), 
	FOREIGN KEY(permission_id) REFERENCES permissions (permission_id)
);
CREATE INDEX ix_role_permissions_role_id ON role_permissions (role_id);

CREATE TABLE subscriptions (
	subscription_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	plan_id BIGINT NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	billing_cycle VARCHAR(10) NOT NULL, 
	start_date DATE, 
	end_date DATE, 
	trial_end_date DATE, 
	auto_renew BOOLEAN NOT NULL, 
	discount_pct NUMERIC(5, 2) NOT NULL, 
	razorpay_subscription_id VARCHAR(100), 
	cancelled_at TIMESTAMP WITH TIME ZONE, 
	cancel_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (subscription_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(plan_id) REFERENCES plans (plan_id)
);
CREATE INDEX ix_subscriptions_status ON subscriptions (status);
CREATE INDEX ix_subscriptions_hospital_id ON subscriptions (hospital_id);

CREATE TABLE users (
	user_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT, 
	role_id BIGINT NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	email VARCHAR(100) NOT NULL, 
	phone VARCHAR(15), 
	password_hash VARCHAR(255) NOT NULL, 
	is_email_verified BOOLEAN NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	last_login_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (user_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(role_id) REFERENCES roles (role_id)
);
CREATE INDEX ix_users_phone ON users (phone);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_hospital_id ON users (hospital_id);
CREATE INDEX ix_users_role_id ON users (role_id);

CREATE TABLE activity_logs (
	log_id BIGSERIAL NOT NULL, 
	user_id BIGINT, 
	action VARCHAR(100) NOT NULL, 
	module VARCHAR(50) NOT NULL, 
	metadata JSON, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (log_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id)
);
CREATE INDEX ix_activity_logs_user_id ON activity_logs (user_id);

CREATE TABLE audit_logs (
	log_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT, 
	user_id BIGINT, 
	user_role VARCHAR(50), 
	module VARCHAR(50) NOT NULL, 
	action VARCHAR(100) NOT NULL, 
	entity_type VARCHAR(50), 
	entity_id BIGINT, 
	old_value JSON, 
	new_value JSON, 
	ip_address VARCHAR(45), 
	user_agent TEXT, 
	request_id VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (log_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id)
);
CREATE INDEX ix_audit_logs_module ON audit_logs (module);
CREATE INDEX ix_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX ix_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX ix_audit_logs_request_id ON audit_logs (request_id);
CREATE INDEX ix_audit_logs_hospital_id ON audit_logs (hospital_id);
CREATE INDEX ix_audit_logs_action ON audit_logs (action);
CREATE INDEX ix_audit_logs_entity_type ON audit_logs (entity_type);

CREATE TABLE department_reports (
	report_id BIGSERIAL NOT NULL, 
	department_id BIGINT NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	month INTEGER NOT NULL, 
	year INTEGER NOT NULL, 
	total_tokens INTEGER NOT NULL, 
	active_doctors INTEGER NOT NULL, 
	avg_wait_mins NUMERIC(6, 2) NOT NULL, 
	total_revenue NUMERIC(10, 2) NOT NULL, 
	busiest_day VARCHAR(10), 
	busiest_hour VARCHAR(10), 
	generated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (report_id), 
	CONSTRAINT uq_department_report UNIQUE (department_id, month, year), 
	FOREIGN KEY(department_id) REFERENCES departments (department_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);
CREATE INDEX ix_department_reports_hospital_id ON department_reports (hospital_id);
CREATE INDEX ix_department_reports_department_id ON department_reports (department_id);

CREATE TABLE doctors (
	doctor_id BIGSERIAL NOT NULL, 
	user_id BIGINT, 
	hospital_id BIGINT NOT NULL, 
	department_id BIGINT, 
	name VARCHAR(120) NOT NULL, 
	specialization VARCHAR(100) NOT NULL, 
	qualification VARCHAR(200) NOT NULL, 
	registration_number VARCHAR(50), 
	hpr_id VARCHAR(64), 
	experience_years INTEGER NOT NULL, 
	consultation_fee NUMERIC(8, 2) NOT NULL, 
	bio TEXT NOT NULL, 
	profile_photo_url VARCHAR(255), 
	languages VARCHAR(200) NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	is_available_today BOOLEAN NOT NULL, 
	verification_status VARCHAR(12) NOT NULL, 
	is_self_registered BOOLEAN NOT NULL, 
	verified_at TIMESTAMP WITH TIME ZONE, 
	verified_by BIGINT, 
	rejection_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (doctor_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(department_id) REFERENCES departments (department_id), 
	FOREIGN KEY(verified_by) REFERENCES users (user_id)
);
CREATE INDEX ix_doctors_hpr_id ON doctors (hpr_id);
CREATE INDEX ix_doctors_hospital_id ON doctors (hospital_id);
CREATE INDEX ix_doctors_user_id ON doctors (user_id);
CREATE INDEX ix_doctors_verification_status ON doctors (verification_status);
CREATE INDEX ix_doctors_department_id ON doctors (department_id);

CREATE TABLE invoices (
	invoice_id BIGSERIAL NOT NULL, 
	subscription_id BIGINT NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	plan_id BIGINT, 
	invoice_number VARCHAR(50) NOT NULL, 
	amount NUMERIC(8, 2) NOT NULL, 
	tax_amount NUMERIC(8, 2) NOT NULL, 
	total_amount NUMERIC(8, 2) NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	due_date DATE, 
	paid_date DATE, 
	status VARCHAR(12) NOT NULL, 
	pdf_url VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (invoice_id), 
	FOREIGN KEY(subscription_id) REFERENCES subscriptions (subscription_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(plan_id) REFERENCES plans (plan_id), 
	UNIQUE (invoice_number)
);
CREATE INDEX ix_invoices_subscription_id ON invoices (subscription_id);
CREATE INDEX ix_invoices_hospital_id ON invoices (hospital_id);

CREATE TABLE login_history (
	log_id BIGSERIAL NOT NULL, 
	user_id BIGINT, 
	ip_address VARCHAR(45) NOT NULL, 
	user_agent TEXT NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (log_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id)
);
CREATE INDEX ix_login_history_user_id ON login_history (user_id);

CREATE TABLE patients (
	patient_id BIGSERIAL NOT NULL, 
	uhid VARCHAR(20), 
	hospital_id BIGINT NOT NULL, 
	user_id BIGINT, 
	name VARCHAR(150) NOT NULL, 
	phone VARCHAR(15) NOT NULL, 
	email VARCHAR(100), 
	abha_number VARCHAR(17), 
	abha_address VARCHAR(64), 
	dob DATE, 
	age INTEGER, 
	gender VARCHAR(8), 
	blood_group VARCHAR(5), 
	photo_url VARCHAR(500), 
	address TEXT NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	pincode VARCHAR(10) NOT NULL, 
	emergency_contact_name VARCHAR(100), 
	emergency_contact_phone VARCHAR(15), 
	preferred_language VARCHAR(50) NOT NULL, 
	is_registered BOOLEAN NOT NULL, 
	registration_source VARCHAR(12) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (patient_id), 
	CONSTRAINT uq_patient_hospital_phone UNIQUE (hospital_id, phone), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id)
);
CREATE INDEX ix_patients_abha_number ON patients (abha_number);
CREATE UNIQUE INDEX ix_patients_uhid ON patients (uhid);
CREATE INDEX ix_patients_phone ON patients (phone);
CREATE INDEX ix_patients_user_id ON patients (user_id);
CREATE INDEX ix_patients_hospital_id ON patients (hospital_id);

CREATE TABLE receptionists (
	receptionist_id BIGSERIAL NOT NULL, 
	user_id BIGINT NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	employee_id VARCHAR(50), 
	designation VARCHAR(100) NOT NULL, 
	departments_assigned JSON, 
	is_active BOOLEAN NOT NULL, 
	joined_date DATE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (receptionist_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);
CREATE INDEX ix_receptionists_hospital_id ON receptionists (hospital_id);
CREATE INDEX ix_receptionists_user_id ON receptionists (user_id);

CREATE TABLE refresh_tokens (
	token_id BIGSERIAL NOT NULL, 
	user_id BIGINT NOT NULL, 
	token_hash VARCHAR(255) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (token_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id)
);
CREATE INDEX ix_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE TABLE allergies (
	allergy_id BIGSERIAL NOT NULL, 
	patient_id BIGINT NOT NULL, 
	allergen VARCHAR(100) NOT NULL, 
	allergy_type VARCHAR(16) NOT NULL, 
	severity VARCHAR(20) NOT NULL, 
	reaction TEXT NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_by BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (allergy_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(created_by) REFERENCES users (user_id)
);
CREATE INDEX ix_allergies_patient_id ON allergies (patient_id);

CREATE TABLE daily_reports (
	report_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	doctor_id BIGINT, 
	report_date DATE NOT NULL, 
	total_tokens INTEGER NOT NULL, 
	tokens_completed INTEGER NOT NULL, 
	tokens_missed INTEGER NOT NULL, 
	tokens_cancelled INTEGER NOT NULL, 
	avg_wait_mins NUMERIC(6, 2) NOT NULL, 
	avg_consult_mins NUMERIC(6, 2) NOT NULL, 
	total_revenue NUMERIC(10, 2) NOT NULL, 
	peak_hour VARCHAR(10), 
	generated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (report_id), 
	CONSTRAINT uq_daily_report UNIQUE (hospital_id, doctor_id, report_date), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id)
);
CREATE INDEX ix_daily_reports_hospital_id ON daily_reports (hospital_id);
CREATE INDEX ix_daily_reports_report_date ON daily_reports (report_date);
CREATE INDEX ix_daily_reports_doctor_id ON daily_reports (doctor_id);

CREATE TABLE doctor_affiliations (
	affiliation_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	hospital_id BIGINT, 
	practice_type VARCHAR(20) NOT NULL, 
	name VARCHAR(150) NOT NULL, 
	address TEXT NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	latitude NUMERIC(9, 6), 
	longitude NUMERIC(9, 6), 
	consultation_fee NUMERIC(8, 2) NOT NULL, 
	mode VARCHAR(12) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	managed_by_hospital BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (affiliation_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);
CREATE INDEX ix_doctor_affiliations_doctor_id ON doctor_affiliations (doctor_id);
CREATE INDEX ix_doctor_affiliations_hospital_id ON doctor_affiliations (hospital_id);

CREATE TABLE doctor_delay_logs (
	delay_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	delay_date DATE NOT NULL, 
	delay_minutes INTEGER NOT NULL, 
	reason VARCHAR(200) NOT NULL, 
	notified_patients BOOLEAN NOT NULL, 
	logged_by BIGINT, 
	logged_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (delay_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(logged_by) REFERENCES users (user_id)
);
CREATE INDEX ix_doctor_delay_logs_doctor_id ON doctor_delay_logs (doctor_id);

CREATE TABLE doctor_documents (
	document_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	doc_type VARCHAR(32) NOT NULL, 
	label VARCHAR(120) NOT NULL, 
	file_url VARCHAR(255) NOT NULL, 
	file_size_kb INTEGER NOT NULL, 
	uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (document_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id)
);
CREATE INDEX ix_doctor_documents_doctor_id ON doctor_documents (doctor_id);

CREATE TABLE doctor_holidays (
	holiday_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	holiday_date DATE NOT NULL, 
	reason VARCHAR(200) NOT NULL, 
	is_full_day BOOLEAN NOT NULL, 
	partial_start TIME WITHOUT TIME ZONE, 
	partial_end TIME WITHOUT TIME ZONE, 
	created_by BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (holiday_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(created_by) REFERENCES users (user_id)
);
CREATE INDEX ix_doctor_holidays_doctor_id ON doctor_holidays (doctor_id);

CREATE TABLE doctor_leave_requests (
	leave_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	leave_from DATE NOT NULL, 
	leave_to DATE NOT NULL, 
	leave_type VARCHAR(16) NOT NULL, 
	reason TEXT NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	approved_by BIGINT, 
	rejection_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (leave_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(approved_by) REFERENCES users (user_id)
);
CREATE INDEX ix_doctor_leave_requests_status ON doctor_leave_requests (status);
CREATE INDEX ix_doctor_leave_requests_doctor_id ON doctor_leave_requests (doctor_id);

CREATE TABLE doctor_reports (
	report_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	month INTEGER NOT NULL, 
	year INTEGER NOT NULL, 
	total_tokens INTEGER NOT NULL, 
	completed_tokens INTEGER NOT NULL, 
	missed_tokens INTEGER NOT NULL, 
	avg_consult_mins NUMERIC(6, 2) NOT NULL, 
	avg_wait_mins NUMERIC(6, 2) NOT NULL, 
	patient_satisfaction_avg NUMERIC(3, 2) NOT NULL, 
	total_delays_mins INTEGER NOT NULL, 
	generated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (report_id), 
	CONSTRAINT uq_doctor_report UNIQUE (doctor_id, month, year), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);
CREATE INDEX ix_doctor_reports_doctor_id ON doctor_reports (doctor_id);
CREATE INDEX ix_doctor_reports_hospital_id ON doctor_reports (hospital_id);

CREATE TABLE doctor_status (
	status_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	note VARCHAR(200) NOT NULL, 
	current_token_id BIGINT, 
	tokens_served_today INTEGER NOT NULL, 
	updated_by BIGINT, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (status_id), 
	UNIQUE (doctor_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(updated_by) REFERENCES users (user_id)
);

CREATE TABLE family_members (
	member_id BIGSERIAL NOT NULL, 
	patient_id BIGINT NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	relation VARCHAR(50) NOT NULL, 
	phone VARCHAR(15), 
	dob DATE, 
	gender VARCHAR(8), 
	blood_group VARCHAR(5), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (member_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id)
);
CREATE INDEX ix_family_members_patient_id ON family_members (patient_id);

CREATE TABLE medical_history (
	history_id BIGSERIAL NOT NULL, 
	patient_id BIGINT NOT NULL, 
	condition VARCHAR(200) NOT NULL, 
	icd_code VARCHAR(20), 
	diagnosed_date DATE, 
	is_chronic BOOLEAN NOT NULL, 
	notes TEXT NOT NULL, 
	created_by BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (history_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(created_by) REFERENCES users (user_id)
);
CREATE INDEX ix_medical_history_patient_id ON medical_history (patient_id);

CREATE TABLE receptionist_shift (
	shift_id BIGSERIAL NOT NULL, 
	receptionist_id BIGINT NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	shift_date DATE NOT NULL, 
	start_time TIME WITHOUT TIME ZONE NOT NULL, 
	end_time TIME WITHOUT TIME ZONE NOT NULL, 
	department_id BIGINT, 
	notes TEXT NOT NULL, 
	created_by BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (shift_id), 
	FOREIGN KEY(receptionist_id) REFERENCES receptionists (receptionist_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(department_id) REFERENCES departments (department_id), 
	FOREIGN KEY(created_by) REFERENCES users (user_id)
);
CREATE INDEX ix_receptionist_shift_receptionist_id ON receptionist_shift (receptionist_id);
CREATE INDEX ix_receptionist_shift_hospital_id ON receptionist_shift (hospital_id);

CREATE TABLE appointments (
	appointment_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	affiliation_id BIGINT, 
	patient_id BIGINT NOT NULL, 
	family_member_id BIGINT, 
	appointment_date DATE NOT NULL, 
	slot_time TIME WITHOUT TIME ZONE, 
	appointment_type VARCHAR(12) NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	consultation_fee NUMERIC(8, 2) NOT NULL, 
	booking_fee_paid NUMERIC(8, 2) NOT NULL, 
	consultation_paid BOOLEAN NOT NULL, 
	consultation_payment_method VARCHAR(12), 
	consultation_paid_at TIMESTAMP WITH TIME ZONE, 
	consultation_paid_by BIGINT, 
	notes TEXT NOT NULL, 
	source VARCHAR(12) NOT NULL, 
	booked_by BIGINT, 
	origin_lat NUMERIC(9, 6), 
	origin_lng NUMERIC(9, 6), 
	origin_label VARCHAR(120) NOT NULL, 
	travel_minutes INTEGER, 
	rating INTEGER, 
	feedback TEXT, 
	confirmed_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (appointment_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(affiliation_id) REFERENCES doctor_affiliations (affiliation_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(family_member_id) REFERENCES family_members (member_id), 
	FOREIGN KEY(consultation_paid_by) REFERENCES users (user_id), 
	FOREIGN KEY(booked_by) REFERENCES users (user_id)
);
CREATE INDEX ix_appointments_appointment_date ON appointments (appointment_date);
CREATE INDEX ix_appointments_hospital_id ON appointments (hospital_id);
CREATE INDEX ix_appointments_patient_id ON appointments (patient_id);
CREATE INDEX ix_appointments_affiliation_id ON appointments (affiliation_id);
CREATE INDEX ix_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX ix_appointments_status ON appointments (status);

CREATE TABLE doctor_schedule (
	schedule_id BIGSERIAL NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	affiliation_id BIGINT, 
	day_of_week VARCHAR(3) NOT NULL, 
	start_time TIME WITHOUT TIME ZONE NOT NULL, 
	end_time TIME WITHOUT TIME ZONE NOT NULL, 
	max_tokens INTEGER NOT NULL, 
	consultation_mins INTEGER NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	valid_from DATE, 
	valid_until DATE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (schedule_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(affiliation_id) REFERENCES doctor_affiliations (affiliation_id)
);
CREATE INDEX ix_doctor_schedule_doctor_id ON doctor_schedule (doctor_id);
CREATE INDEX ix_doctor_schedule_affiliation_id ON doctor_schedule (affiliation_id);

CREATE TABLE appointment_payments (
	payment_pk BIGSERIAL NOT NULL, 
	razorpay_order_id VARCHAR(64) NOT NULL, 
	razorpay_payment_id VARCHAR(64), 
	patient_id BIGINT, 
	appointment_id BIGINT, 
	amount NUMERIC(8, 2) NOT NULL, 
	currency VARCHAR(8) NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	booking_json TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (payment_pk), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id)
);
CREATE INDEX ix_appointment_payments_status ON appointment_payments (status);
CREATE INDEX ix_appointment_payments_razorpay_payment_id ON appointment_payments (razorpay_payment_id);
CREATE INDEX ix_appointment_payments_appointment_id ON appointment_payments (appointment_id);
CREATE INDEX ix_appointment_payments_patient_id ON appointment_payments (patient_id);
CREATE UNIQUE INDEX ix_appointment_payments_razorpay_order_id ON appointment_payments (razorpay_order_id);

CREATE TABLE appt_cancellation_logs (
	log_id BIGSERIAL NOT NULL, 
	appointment_id BIGINT NOT NULL, 
	cancelled_by BIGINT, 
	cancel_reason TEXT NOT NULL, 
	refund_status VARCHAR(12) NOT NULL, 
	refund_amount NUMERIC(8, 2) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (log_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id), 
	FOREIGN KEY(cancelled_by) REFERENCES users (user_id)
);
CREATE INDEX ix_appt_cancellation_logs_appointment_id ON appt_cancellation_logs (appointment_id);

CREATE TABLE appt_reschedule_history (
	reschedule_id BIGSERIAL NOT NULL, 
	appointment_id BIGINT NOT NULL, 
	old_date DATE, 
	old_time TIME WITHOUT TIME ZONE, 
	new_date DATE, 
	new_time TIME WITHOUT TIME ZONE, 
	rescheduled_by BIGINT, 
	reason TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (reschedule_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id), 
	FOREIGN KEY(rescheduled_by) REFERENCES users (user_id)
);
CREATE INDEX ix_appt_reschedule_history_appointment_id ON appt_reschedule_history (appointment_id);

CREATE TABLE appt_status_history (
	history_id BIGSERIAL NOT NULL, 
	appointment_id BIGINT NOT NULL, 
	old_status VARCHAR(12), 
	new_status VARCHAR(12) NOT NULL, 
	changed_by BIGINT, 
	reason TEXT NOT NULL, 
	changed_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (history_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id), 
	FOREIGN KEY(changed_by) REFERENCES users (user_id)
);
CREATE INDEX ix_appt_status_history_appointment_id ON appt_status_history (appointment_id);

CREATE TABLE doctor_breaks (
	break_id BIGSERIAL NOT NULL, 
	schedule_id BIGINT NOT NULL, 
	break_start TIME WITHOUT TIME ZONE NOT NULL, 
	break_end TIME WITHOUT TIME ZONE NOT NULL, 
	label VARCHAR(50) NOT NULL, 
	is_recurring BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (break_id), 
	FOREIGN KEY(schedule_id) REFERENCES doctor_schedule (schedule_id)
);
CREATE INDEX ix_doctor_breaks_schedule_id ON doctor_breaks (schedule_id);

CREATE TABLE patient_documents (
	document_id BIGSERIAL NOT NULL, 
	patient_id BIGINT NOT NULL, 
	document_type VARCHAR(16) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	file_url VARCHAR(500) NOT NULL, 
	file_size_kb INTEGER, 
	mime_type VARCHAR(100), 
	uploaded_by BIGINT, 
	appointment_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (document_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(uploaded_by) REFERENCES users (user_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id)
);
CREATE INDEX ix_patient_documents_patient_id ON patient_documents (patient_id);

CREATE TABLE patient_vitals (
	vital_id BIGSERIAL NOT NULL, 
	patient_id BIGINT NOT NULL, 
	appointment_id BIGINT, 
	family_member_id BIGINT, 
	bp_systolic INTEGER, 
	bp_diastolic INTEGER, 
	pulse INTEGER, 
	temperature_f NUMERIC(4, 1), 
	spo2 INTEGER, 
	respiratory_rate INTEGER, 
	weight_kg NUMERIC(5, 1), 
	height_cm NUMERIC(5, 1), 
	blood_sugar INTEGER, 
	sugar_type VARCHAR(10), 
	notes TEXT NOT NULL, 
	recorded_by BIGINT, 
	recorded_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (vital_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id), 
	FOREIGN KEY(family_member_id) REFERENCES family_members (member_id), 
	FOREIGN KEY(recorded_by) REFERENCES users (user_id)
);
CREATE INDEX ix_patient_vitals_appointment_id ON patient_vitals (appointment_id);
CREATE INDEX ix_patient_vitals_patient_id ON patient_vitals (patient_id);
CREATE INDEX ix_patient_vitals_family_member_id ON patient_vitals (family_member_id);
CREATE INDEX ix_patient_vitals_recorded_at ON patient_vitals (recorded_at);

CREATE TABLE prescriptions (
	prescription_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	patient_id BIGINT NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	appointment_id BIGINT, 
	family_member_id BIGINT, 
	diagnosis TEXT NOT NULL, 
	advice TEXT NOT NULL, 
	follow_up_date DATE, 
	created_by BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (prescription_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id), 
	FOREIGN KEY(family_member_id) REFERENCES family_members (member_id), 
	FOREIGN KEY(created_by) REFERENCES users (user_id)
);
CREATE INDEX ix_prescriptions_patient_id ON prescriptions (patient_id);
CREATE INDEX ix_prescriptions_family_member_id ON prescriptions (family_member_id);
CREATE INDEX ix_prescriptions_created_at ON prescriptions (created_at);
CREATE INDEX ix_prescriptions_doctor_id ON prescriptions (doctor_id);
CREATE INDEX ix_prescriptions_hospital_id ON prescriptions (hospital_id);
CREATE INDEX ix_prescriptions_appointment_id ON prescriptions (appointment_id);

CREATE TABLE tokens (
	token_id BIGSERIAL NOT NULL, 
	appointment_id BIGINT, 
	doctor_id BIGINT NOT NULL, 
	affiliation_id BIGINT, 
	patient_id BIGINT, 
	hospital_id BIGINT NOT NULL, 
	token_number INTEGER NOT NULL, 
	display_code VARCHAR(20) NOT NULL, 
	token_date DATE NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	priority VARCHAR(12) NOT NULL, 
	queue_position INTEGER NOT NULL, 
	estimated_time TIMESTAMP WITH TIME ZONE, 
	actual_start TIMESTAMP WITH TIME ZONE, 
	actual_end TIMESTAMP WITH TIME ZONE, 
	wait_duration_mins INTEGER, 
	consult_duration_mins INTEGER, 
	is_walkin BOOLEAN NOT NULL, 
	origin_lat NUMERIC(9, 6), 
	origin_lng NUMERIC(9, 6), 
	origin_label VARCHAR(120) NOT NULL, 
	travel_minutes INTEGER, 
	notified_leave BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (token_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(affiliation_id) REFERENCES doctor_affiliations (affiliation_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id)
);
CREATE INDEX ix_tokens_hospital_id ON tokens (hospital_id);
CREATE INDEX ix_tokens_appointment_id ON tokens (appointment_id);
CREATE INDEX ix_tokens_doctor_id ON tokens (doctor_id);
CREATE INDEX ix_tokens_status ON tokens (status);
CREATE INDEX ix_tokens_token_date ON tokens (token_date);
CREATE INDEX ix_tokens_patient_id ON tokens (patient_id);
CREATE INDEX ix_tokens_affiliation_id ON tokens (affiliation_id);

CREATE TABLE emergency_queue (
	emergency_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT NOT NULL, 
	doctor_id BIGINT NOT NULL, 
	patient_id BIGINT, 
	token_id BIGINT, 
	patient_name VARCHAR(100) NOT NULL, 
	patient_phone VARCHAR(15), 
	condition_description TEXT NOT NULL, 
	priority VARCHAR(12) NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	attended_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	logged_by BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (emergency_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(doctor_id) REFERENCES doctors (doctor_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(token_id) REFERENCES tokens (token_id), 
	FOREIGN KEY(logged_by) REFERENCES users (user_id)
);
CREATE INDEX ix_emergency_queue_status ON emergency_queue (status);
CREATE INDEX ix_emergency_queue_hospital_id ON emergency_queue (hospital_id);
CREATE INDEX ix_emergency_queue_doctor_id ON emergency_queue (doctor_id);

CREATE TABLE notifications (
	notification_id BIGSERIAL NOT NULL, 
	hospital_id BIGINT, 
	patient_id BIGINT, 
	appointment_id BIGINT, 
	token_id BIGINT, 
	type VARCHAR(16) NOT NULL, 
	channel VARCHAR(10) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	message TEXT NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	delivered_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (notification_id), 
	FOREIGN KEY(hospital_id) REFERENCES hospitals (hospital_id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id), 
	FOREIGN KEY(appointment_id) REFERENCES appointments (appointment_id), 
	FOREIGN KEY(token_id) REFERENCES tokens (token_id)
);
CREATE INDEX ix_notifications_patient_id ON notifications (patient_id);
CREATE INDEX ix_notifications_hospital_id ON notifications (hospital_id);
CREATE INDEX ix_notifications_status ON notifications (status);

CREATE TABLE prescription_items (
	item_id BIGSERIAL NOT NULL, 
	prescription_id BIGINT NOT NULL, 
	drug_name VARCHAR(200) NOT NULL, 
	dosage VARCHAR(100) NOT NULL, 
	frequency VARCHAR(100) NOT NULL, 
	duration VARCHAR(100) NOT NULL, 
	instructions TEXT NOT NULL, 
	PRIMARY KEY (item_id), 
	FOREIGN KEY(prescription_id) REFERENCES prescriptions (prescription_id)
);
CREATE INDEX ix_prescription_items_prescription_id ON prescription_items (prescription_id);

CREATE TABLE token_movement_logs (
	log_id BIGSERIAL NOT NULL, 
	token_id BIGINT NOT NULL, 
	action VARCHAR(20) NOT NULL, 
	from_position INTEGER, 
	to_position INTEGER, 
	triggered_by BIGINT, 
	notes VARCHAR(200) NOT NULL, 
	logged_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (log_id), 
	FOREIGN KEY(token_id) REFERENCES tokens (token_id), 
	FOREIGN KEY(triggered_by) REFERENCES users (user_id)
);
CREATE INDEX ix_token_movement_logs_token_id ON token_movement_logs (token_id);

CREATE TABLE token_recall_history (
	recall_id BIGSERIAL NOT NULL, 
	token_id BIGINT NOT NULL, 
	recall_count INTEGER NOT NULL, 
	last_recalled_at TIMESTAMP WITH TIME ZONE, 
	recall_method VARCHAR(20) NOT NULL, 
	recalled_by BIGINT, 
	PRIMARY KEY (recall_id), 
	UNIQUE (token_id), 
	FOREIGN KEY(token_id) REFERENCES tokens (token_id), 
	FOREIGN KEY(recalled_by) REFERENCES users (user_id)
);

CREATE TABLE token_status_history (
	history_id BIGSERIAL NOT NULL, 
	token_id BIGINT NOT NULL, 
	old_status VARCHAR(12), 
	new_status VARCHAR(12) NOT NULL, 
	changed_by BIGINT, 
	reason TEXT NOT NULL, 
	changed_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (history_id), 
	FOREIGN KEY(token_id) REFERENCES tokens (token_id), 
	FOREIGN KEY(changed_by) REFERENCES users (user_id)
);
CREATE INDEX ix_token_status_history_token_id ON token_status_history (token_id);

CREATE TABLE email_logs (
	email_id BIGSERIAL NOT NULL, 
	notification_id BIGINT NOT NULL, 
	to_email VARCHAR(100) NOT NULL, 
	subject VARCHAR(255) NOT NULL, 
	provider VARCHAR(50) NOT NULL, 
	provider_msg_id VARCHAR(100), 
	status VARCHAR(12) NOT NULL, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	opened_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (email_id), 
	FOREIGN KEY(notification_id) REFERENCES notifications (notification_id)
);
CREATE INDEX ix_email_logs_notification_id ON email_logs (notification_id);

CREATE TABLE push_notifications (
	push_id BIGSERIAL NOT NULL, 
	notification_id BIGINT NOT NULL, 
	device_token VARCHAR(500) NOT NULL, 
	platform VARCHAR(10) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	body TEXT NOT NULL, 
	data_payload JSON, 
	status VARCHAR(12) NOT NULL, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (push_id), 
	FOREIGN KEY(notification_id) REFERENCES notifications (notification_id)
);
CREATE INDEX ix_push_notifications_notification_id ON push_notifications (notification_id);

CREATE TABLE sms_logs (
	sms_id BIGSERIAL NOT NULL, 
	notification_id BIGINT NOT NULL, 
	phone VARCHAR(15) NOT NULL, 
	provider VARCHAR(50) NOT NULL, 
	provider_msg_id VARCHAR(100), 
	template_id VARCHAR(100), 
	message_text TEXT NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	error_code VARCHAR(50), 
	error_message TEXT, 
	cost NUMERIC(6, 4) NOT NULL, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	delivered_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (sms_id), 
	FOREIGN KEY(notification_id) REFERENCES notifications (notification_id)
);
CREATE INDEX ix_sms_logs_notification_id ON sms_logs (notification_id);

CREATE TABLE whatsapp_logs (
	wa_id BIGSERIAL NOT NULL, 
	notification_id BIGINT NOT NULL, 
	phone VARCHAR(15) NOT NULL, 
	provider VARCHAR(50) NOT NULL, 
	provider_msg_id VARCHAR(100), 
	template_name VARCHAR(100), 
	status VARCHAR(12) NOT NULL, 
	error_code VARCHAR(50), 
	cost NUMERIC(6, 4) NOT NULL, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	delivered_at TIMESTAMP WITH TIME ZONE, 
	read_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (wa_id), 
	FOREIGN KEY(notification_id) REFERENCES notifications (notification_id)
);
CREATE INDEX ix_whatsapp_logs_notification_id ON whatsapp_logs (notification_id);
