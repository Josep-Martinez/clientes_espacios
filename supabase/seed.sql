-- Reproducible synthetic catalogue. Dates move forward from the day of reset.
INSERT INTO bookfit.locations (id, slug, name, x_km, y_km, is_online) VALUES
('20000000-0000-4000-8000-000000000001','ruzafa','Ruzafa',0,0,false),
('20000000-0000-4000-8000-000000000002','centro','Centro',2.1,0.4,false),
('20000000-0000-4000-8000-000000000003','benimaclet','Benimaclet',0.8,4.1,false),
('20000000-0000-4000-8000-000000000004','mestalla','Mestalla',1.3,2.0,false),
('20000000-0000-4000-8000-000000000005','cabanyal','Cabanyal',5.2,0.7,false),
('20000000-0000-4000-8000-000000000006','patraix','Patraix',-3.1,-2.2,false),
('20000000-0000-4000-8000-000000000007','campanar','Campanar',-1.5,4.4,false),
('20000000-0000-4000-8000-000000000008','online','En línea',0,0,true);

INSERT INTO bookfit.actors (id, display_name, is_demo) VALUES
('10000000-0000-4000-8000-000000000001','Nerea Soler',true),
('10000000-0000-4000-8000-000000000002','Alex Vidal',true),
('10000000-0000-4000-8000-000000000003','Marina Ortega',true),
('10000000-0000-4000-8000-000000000004','Nora Vidal',true),
('10000000-0000-4000-8000-000000000005','Leo Ferrer',true),
('10000000-0000-4000-8000-000000000006','Alba Mateu',true),
('10000000-0000-4000-8000-000000000007','Marta Soler',true),
('10000000-0000-4000-8000-000000000008','Vera Campos',true),
('10000000-0000-4000-8000-000000000009','Iris Blasco',true),
('10000000-0000-4000-8000-000000000010','Gestión Senda',true);

INSERT INTO bookfit.actor_roles (actor_id, role) VALUES
('10000000-0000-4000-8000-000000000001','client'),
('10000000-0000-4000-8000-000000000002','client'),
('10000000-0000-4000-8000-000000000003','professional'),
('10000000-0000-4000-8000-000000000004','professional'),
('10000000-0000-4000-8000-000000000005','professional'),
('10000000-0000-4000-8000-000000000005','space_manager'),
('10000000-0000-4000-8000-000000000006','professional'),
('10000000-0000-4000-8000-000000000007','professional'),
('10000000-0000-4000-8000-000000000008','professional'),
('10000000-0000-4000-8000-000000000009','professional'),
('10000000-0000-4000-8000-000000000010','space_manager');

INSERT INTO bookfit.professionals
(id, actor_id, slug, headline, bio, public_zone, public_location_id, rating, review_count, categories) VALUES
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','marina-ortega','Entrenamiento personal','Sesiones de fuerza y movimiento adaptadas a tu ritmo.','Ruzafa · València','20000000-0000-4000-8000-000000000001',4.9,86,ARRAY['Entrenamiento personal','Preparación física']),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','nora-vidal','Pilates y movilidad','Clases cuidadas para ganar fuerza, control y libertad de movimiento.','Benimaclet · València','20000000-0000-4000-8000-000000000003',4.8,52,ARRAY['Pilates','Movilidad']),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000005','leo-ferrer','Fisioterapia','Valoración y tratamiento de movimiento con objetivos claros.','Centro · València','20000000-0000-4000-8000-000000000002',4.9,114,ARRAY['Fisioterapia']),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000006','alba-mateu','Yoga y respiración','Prácticas accesibles para recuperar espacio y energía.','Mestalla · València','20000000-0000-4000-8000-000000000004',4.8,38,ARRAY['Yoga']),
('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000007','marta-soler','Podología','Cuidado y orientación para que tus pasos acompañen tu día a día.','Centro · València','20000000-0000-4000-8000-000000000002',4.9,67,ARRAY['Podología']),
('30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000008','vera-campos','Masaje deportivo','Sesiones de recuperación en una sala tranquila y equipada.','Ruzafa · València','20000000-0000-4000-8000-000000000001',4.7,42,ARRAY['Masaje deportivo','Masaje terapéutico']),
('30000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000009','iris-blasco','Nutrición','Acompañamiento nutricional práctico y compatible con tu rutina.','València · En línea','20000000-0000-4000-8000-000000000008',5.0,29,ARRAY['Dietética y nutrición']);

INSERT INTO bookfit.professional_preferences
(professional_id, base_location_id, max_radius_km, max_travel_minutes, buffer_minutes, modalities)
SELECT p.id, p.public_location_id, 8, 35, 15,
  CASE p.slug
    WHEN 'marina-ortega' THEN ARRAY['room','gym','home','online']
    WHEN 'nora-vidal' THEN ARRAY['room','gym','online']
    WHEN 'leo-ferrer' THEN ARRAY['room','home','online']
    WHEN 'alba-mateu' THEN ARRAY['room','gym','online']
    WHEN 'marta-soler' THEN ARRAY['room']
    WHEN 'vera-campos' THEN ARRAY['room','home']
    ELSE ARRAY['online']
  END
FROM bookfit.professionals p;

INSERT INTO bookfit.professional_hours (professional_id, weekday, opens_at, closes_at)
SELECT p.id, d, '08:00'::time, '20:00'::time
FROM bookfit.professionals p CROSS JOIN generate_series(1,6) AS d;

INSERT INTO bookfit.services
(id, professional_id, slug, name, category, description, service_format, duration_minutes, price_cents, modalities, required_equipment, group_capacity, class_activity) VALUES
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','entrenamiento-uno-a-uno','Entrenamiento personal','Entrenamiento personal','Una sesión individual de fuerza y acondicionamiento.','individual',60,3800,ARRAY['room','gym','home','online'],ARRAY['bandas','mancuernas'],NULL,NULL),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','entrenamiento-gimnasio','Sesión en gimnasio','Entrenamiento personal','Entrena con material completo y acceso de bienvenida al centro.','individual',55,3400,ARRAY['gym'],ARRAY['mancuernas'],NULL,NULL),
('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','pilates-grupo','Pilates con reformer','Pilates','Clase de grupo con plazas limitadas y fechas seleccionables.','group',55,1600,ARRAY['room'],ARRAY['reformer'],8,'Pilates en grupo'),
('40000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','yoga-flujo','Yoga: flujo de mañana','Yoga','Una práctica grupal para empezar el día con movimiento.','group',60,1400,ARRAY['room'],ARRAY['esterillas'],12,'Yoga en grupo'),
('40000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000002','movilidad-individual','Sesión de movilidad','Movilidad','Trabajo individual de control, rango y movimiento.','individual',50,3200,ARRAY['room','online'],ARRAY['esterillas'],NULL,NULL),
('40000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000003','fisioterapia','Fisioterapia y valoración','Fisioterapia','Sesión individual en consulta o en línea.','individual',50,5200,ARRAY['room','home','online'],ARRAY['camilla'],NULL,NULL),
('40000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000005','podologia','Valoración podológica','Podología','Consulta individual en una sala de atención privada.','individual',45,4700,ARRAY['room'],ARRAY['camilla'],NULL,NULL),
('40000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000006','masaje-deportivo','Masaje deportivo','Masaje deportivo','Sesión de recuperación en una sala preparada.','individual',60,4900,ARRAY['room','home'],ARRAY['camilla'],NULL,NULL),
('40000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000007','nutricion-online','Consulta de nutrición','Dietética y nutrición','Sesión individual en línea para revisar tus objetivos.','individual',45,4200,ARRAY['online'],ARRAY[]::text[],NULL,NULL);

INSERT INTO bookfit.spaces
(id, slug, name, kind, location_id, capacity, equipment, amenities, description, price_per_occurrence_cents, access_instructions) VALUES
('50000000-0000-4000-8000-000000000001','loft-rueda','Loft Rueda','room','20000000-0000-4000-8000-000000000001',5,ARRAY['bandas','mancuernas','esterillas'],ARRAY['Accesible','Vestuario','Luz natural'],'Sala de movimiento con luz natural y material funcional.',1800,'Instrucciones privadas de acceso para una reserva confirmada.'),
('50000000-0000-4000-8000-000000000002','consulta-azul','Consulta Azul','room','20000000-0000-4000-8000-000000000002',2,ARRAY['camilla'],ARRAY['Privacidad','Baño','Recepción'],'Consulta privada para fisioterapia, podología y masaje.',1600,'Instrucciones privadas de acceso para una reserva confirmada.'),
('50000000-0000-4000-8000-000000000003','estudio-reformer','Estudio Reformer','room','20000000-0000-4000-8000-000000000003',8,ARRAY['reformer','esterillas'],ARRAY['Reformers','Duchas','Recepción'],'Estudio para sesiones de Pilates individual y grupal.',2400,'Instrucciones privadas de acceso para una reserva confirmada.'),
('50000000-0000-4000-8000-000000000004','patio-move','Patio Move','room','20000000-0000-4000-8000-000000000004',14,ARRAY['esterillas','bandas'],ARRAY['Accesible','Esterillas','Zona de espera'],'Espacio amplio para yoga, movilidad y actividad suave.',2000,'Instrucciones privadas de acceso para una reserva confirmada.'),
('50000000-0000-4000-8000-000000000005','senda-gym','Senda Gym','gym','20000000-0000-4000-8000-000000000001',40,ARRAY['mancuernas','bandas','máquinas','racks'],ARRAY['Duchas','Taquillas','Zona de fuerza'],'Gimnasio con zona de fuerza y material variado.',700,'Instrucciones privadas de acceso para una reserva confirmada.'),
('50000000-0000-4000-8000-000000000006','activa-cabanyal','Activa Cabanyal','gym','20000000-0000-4000-8000-000000000005',55,ARRAY['mancuernas','máquinas','racks'],ARRAY['Duchas','Taquillas','Accesible'],'Gimnasio amplio con zona de entrenamiento funcional.',600,'Instrucciones privadas de acceso para una reserva confirmada.');

INSERT INTO bookfit.space_memberships (space_id, actor_id, membership_role) VALUES
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000010','owner'),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005','owner'),
('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000010','manager'),
('50000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000005','owner'),
('50000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000010','owner'),
('50000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000010','manager');

INSERT INTO bookfit.space_opening_hours (space_id, weekday, opens_at, closes_at)
SELECT s.id, d, CASE WHEN s.kind='gym' THEN '06:00'::time ELSE '08:00'::time END,
       CASE WHEN s.kind='gym' THEN '23:00'::time ELSE '22:00'::time END
FROM bookfit.spaces s CROSS JOIN generate_series(0,6) AS d;

-- Classes reserve the teacher and room once; attendee allocations only consume seats.
WITH anchors AS (
  SELECT ((3 - EXTRACT(DOW FROM current_date)::int + 7) % 7) AS wed_delta,
         ((6 - EXTRACT(DOW FROM current_date)::int + 7) % 7) AS sat_delta
), dates AS (
  SELECT i,
    current_date + CASE WHEN wed_delta=0 THEN 7 ELSE wed_delta END + (i * 7) AS wed,
    current_date + CASE WHEN sat_delta=0 THEN 7 ELSE sat_delta END + (i * 7) AS sat
  FROM anchors CROSS JOIN generate_series(0,3) AS i
)
INSERT INTO bookfit.class_sessions (id, service_id, professional_id, space_id, service_date, starts_at, ends_at, capacity)
SELECT ('60000000-0000-4000-8000-' || lpad((i + 1)::text,12,'0'))::uuid,
       '40000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,
       '50000000-0000-4000-8000-000000000003'::uuid,wed,
       (wed + time '18:00') AT TIME ZONE 'Europe/Madrid',
       (wed + time '18:55') AT TIME ZONE 'Europe/Madrid',8
FROM dates
UNION ALL
SELECT ('60000000-0000-4000-8000-' || lpad((i + 5)::text,12,'0'))::uuid,
       '40000000-0000-4000-8000-000000000004'::uuid,'30000000-0000-4000-8000-000000000004'::uuid,
       '50000000-0000-4000-8000-000000000004'::uuid,sat,
       (sat + time '10:00') AT TIME ZONE 'Europe/Madrid',
       (sat + time '11:00') AT TIME ZONE 'Europe/Madrid',12
FROM dates;

INSERT INTO bookfit.resource_allocations
(resource_kind, resource_id, location_id, service_date, starts_at, ends_at, class_session_id, status)
SELECT 'professional', c.professional_id, s.location_id, c.service_date, c.starts_at, c.ends_at, c.id, 'confirmed'
FROM bookfit.class_sessions c JOIN bookfit.spaces s ON s.id=c.space_id
UNION ALL
SELECT 'space', c.space_id, s.location_id, c.service_date, c.starts_at, c.ends_at, c.id, 'confirmed'
FROM bookfit.class_sessions c JOIN bookfit.spaces s ON s.id=c.space_id;

-- Existing class attendance leaves one place in the first Pilates session and fills the second.
INSERT INTO bookfit.orders
(id, client_actor_id, professional_id, service_id, space_id, mode, seats, status, subtotal_service_cents,
 service_commission_cents, subtotal_space_cents, space_commission_cents, total_cents)
VALUES
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','room',7,'paid',11200,1120,2400,288,15008),
('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','room',8,'paid',12800,1280,2400,288,16768);

INSERT INTO bookfit.booking_occurrences
(id, order_id, class_session_id, service_date, starts_at, ends_at, status, location_id,
 x_service_cents, z_service_commission_cents, y_space_cents, w_space_commission_cents)
SELECT ('71000000-0000-4000-8000-' || lpad((row_number() OVER (ORDER BY c.service_date))::text,12,'0'))::uuid,
       CASE WHEN c.service_date=(SELECT min(service_date) FROM bookfit.class_sessions WHERE service_id='40000000-0000-4000-8000-000000000003')
            THEN '70000000-0000-4000-8000-000000000001'::uuid ELSE '70000000-0000-4000-8000-000000000002'::uuid END,
       c.id,c.service_date,c.starts_at,c.ends_at,'confirmed','20000000-0000-4000-8000-000000000003',
       CASE WHEN c.service_date=(SELECT min(service_date) FROM bookfit.class_sessions WHERE service_id='40000000-0000-4000-8000-000000000003') THEN 11200 ELSE 12800 END,
       CASE WHEN c.service_date=(SELECT min(service_date) FROM bookfit.class_sessions WHERE service_id='40000000-0000-4000-8000-000000000003') THEN 1120 ELSE 1280 END,
       2400,288
FROM bookfit.class_sessions c
WHERE c.service_id='40000000-0000-4000-8000-000000000003' AND c.service_date IN (
  (SELECT min(service_date) FROM bookfit.class_sessions WHERE service_id='40000000-0000-4000-8000-000000000003'),
  (SELECT service_date FROM bookfit.class_sessions WHERE service_id='40000000-0000-4000-8000-000000000003' ORDER BY service_date OFFSET 1 LIMIT 1)
);

INSERT INTO bookfit.seat_allocations (order_id, class_session_id, client_actor_id, seats, status)
SELECT o.id,c.id,o.client_actor_id,o.seats,'confirmed'
FROM bookfit.orders o JOIN bookfit.class_sessions c
  ON c.service_id=o.service_id
 AND ((o.id='70000000-0000-4000-8000-000000000001' AND c.service_date=(SELECT min(service_date) FROM bookfit.class_sessions WHERE service_id=o.service_id))
   OR (o.id='70000000-0000-4000-8000-000000000002' AND c.service_date=(SELECT service_date FROM bookfit.class_sessions WHERE service_id=o.service_id ORDER BY service_date OFFSET 1 LIMIT 1)));

INSERT INTO bookfit.order_lines (occurrence_id,line_type,description,amount_cents)
SELECT b.id, lines.line_type, lines.description, lines.amount_cents
FROM bookfit.booking_occurrences b CROSS JOIN LATERAL (VALUES
 ('service','Servicio profesional',b.x_service_cents),
 ('service_commission','Comisión del servicio · ejemplo 10%',b.z_service_commission_cents),
 ('space','Uso del espacio',b.y_space_cents),
 ('space_commission','Comisión del espacio · ejemplo 12%',b.w_space_commission_cents)
) AS lines(line_type,description,amount_cents);

INSERT INTO bookfit.payment_attempts (order_id,provider,provider_reference,status,amount_cents)
SELECT o.id,'fake','seed:'||o.id,'succeeded',o.total_cents FROM bookfit.orders o;

INSERT INTO bookfit.payment_events (provider,provider_event_id,payment_attempt_id,event_type)
SELECT p.provider,p.provider_reference,p.id,'seed.succeeded' FROM bookfit.payment_attempts p;

-- A simple upcoming individual appointment provides real data for all role agendas and conflicts.
WITH slot AS (
  SELECT current_date + 2 AS service_date
)
INSERT INTO bookfit.orders
(id,client_actor_id,professional_id,service_id,space_id,mode,seats,status,subtotal_service_cents,
 service_commission_cents,subtotal_space_cents,space_commission_cents,total_cents)
SELECT '70000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002',
       '30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-000000000001','room',1,'paid',3800,380,1800,216,6196
FROM slot;

WITH slot AS (SELECT current_date + 2 AS service_date)
INSERT INTO bookfit.booking_occurrences
(id,order_id,service_date,starts_at,ends_at,status,location_id,x_service_cents,z_service_commission_cents,y_space_cents,w_space_commission_cents)
SELECT '71000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000003',service_date,
       (service_date + time '10:00') AT TIME ZONE 'Europe/Madrid',
       (service_date + time '11:00') AT TIME ZONE 'Europe/Madrid','confirmed',
       '20000000-0000-4000-8000-000000000001',3800,380,1800,216 FROM slot;

INSERT INTO bookfit.resource_allocations
(resource_kind,resource_id,location_id,service_date,starts_at,ends_at,order_id,status)
SELECT 'professional',o.professional_id,b.location_id,b.service_date,b.starts_at,b.ends_at,o.id,'confirmed'
FROM bookfit.orders o JOIN bookfit.booking_occurrences b ON b.order_id=o.id
WHERE o.id='70000000-0000-4000-8000-000000000003'
UNION ALL
SELECT 'space',o.space_id,b.location_id,b.service_date,b.starts_at,b.ends_at,o.id,'confirmed'
FROM bookfit.orders o JOIN bookfit.booking_occurrences b ON b.order_id=o.id
WHERE o.id='70000000-0000-4000-8000-000000000003';

INSERT INTO bookfit.order_lines (occurrence_id,line_type,description,amount_cents)
SELECT b.id,lines.line_type,lines.description,lines.amount_cents
FROM bookfit.booking_occurrences b CROSS JOIN LATERAL (VALUES
 ('service','Servicio profesional',b.x_service_cents),
 ('service_commission','Comisión del servicio · ejemplo 10%',b.z_service_commission_cents),
 ('space','Uso del espacio',b.y_space_cents),
 ('space_commission','Comisión del espacio · ejemplo 12%',b.w_space_commission_cents)
) AS lines(line_type,description,amount_cents)
WHERE b.order_id='70000000-0000-4000-8000-000000000003';

INSERT INTO bookfit.payment_attempts (order_id,provider,provider_reference,status,amount_cents)
VALUES ('70000000-0000-4000-8000-000000000003','fake','seed:70000000-0000-4000-8000-000000000003','succeeded',6196);
INSERT INTO bookfit.payment_events (provider,provider_event_id,payment_attempt_id,event_type)
SELECT provider,provider_reference,id,'seed.succeeded' FROM bookfit.payment_attempts
WHERE order_id='70000000-0000-4000-8000-000000000003';

-- A separate first-gym visit keeps the complimentary entry visible in manager metrics.
INSERT INTO bookfit.orders
(id,client_actor_id,professional_id,service_id,space_id,mode,seats,status,subtotal_service_cents,
 service_commission_cents,subtotal_space_cents,space_commission_cents,total_cents)
VALUES ('70000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',
        '50000000-0000-4000-8000-000000000005','gym',1,'paid',3400,340,0,0,3740);

INSERT INTO bookfit.gym_entitlements (client_actor_id,space_id,order_id,status)
VALUES ('10000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000005','70000000-0000-4000-8000-000000000004','consumed');

INSERT INTO bookfit.booking_occurrences
(id,order_id,service_date,starts_at,ends_at,status,location_id,x_service_cents,z_service_commission_cents,y_space_cents,w_space_commission_cents)
VALUES ('71000000-0000-4000-8000-000000000004','70000000-0000-4000-8000-000000000004',current_date+3,
        ((current_date+3)+time '15:00') AT TIME ZONE 'Europe/Madrid',
        ((current_date+3)+time '15:55') AT TIME ZONE 'Europe/Madrid','confirmed',
        '20000000-0000-4000-8000-000000000001',3400,340,0,0);

INSERT INTO bookfit.resource_allocations
(resource_kind,resource_id,location_id,service_date,starts_at,ends_at,order_id,status)
SELECT 'professional',o.professional_id,b.location_id,b.service_date,b.starts_at,b.ends_at,o.id,'confirmed'
FROM bookfit.orders o JOIN bookfit.booking_occurrences b ON b.order_id=o.id
WHERE o.id='70000000-0000-4000-8000-000000000004'
UNION ALL
SELECT 'space',o.space_id,b.location_id,b.service_date,b.starts_at,b.ends_at,o.id,'confirmed'
FROM bookfit.orders o JOIN bookfit.booking_occurrences b ON b.order_id=o.id
WHERE o.id='70000000-0000-4000-8000-000000000004';

INSERT INTO bookfit.order_lines (occurrence_id,line_type,description,amount_cents)
SELECT b.id,lines.line_type,lines.description,lines.amount_cents
FROM bookfit.booking_occurrences b CROSS JOIN LATERAL (VALUES
 ('service','Servicio profesional',b.x_service_cents),
 ('service_commission','Comisión del servicio · ejemplo 10%',b.z_service_commission_cents),
 ('space','Primera entrada al gimnasio · cortesía',b.y_space_cents),
 ('space_commission','Comisión del espacio · ejemplo 12%',b.w_space_commission_cents)
) AS lines(line_type,description,amount_cents)
WHERE b.order_id='70000000-0000-4000-8000-000000000004';

INSERT INTO bookfit.payment_attempts (order_id,provider,provider_reference,status,amount_cents)
VALUES ('70000000-0000-4000-8000-000000000004','fake','seed:70000000-0000-4000-8000-000000000004','succeeded',3740);
INSERT INTO bookfit.payment_events (provider,provider_event_id,payment_attempt_id,event_type)
SELECT provider,provider_reference,id,'seed.succeeded' FROM bookfit.payment_attempts
WHERE order_id='70000000-0000-4000-8000-000000000004';

-- Leo is both the professional and space manager for Consulta Azul; this paid visit
-- must appear once in his combined agenda even though it matches both scopes.
INSERT INTO bookfit.orders
(id,client_actor_id,professional_id,service_id,space_id,mode,seats,status,subtotal_service_cents,
 service_commission_cents,subtotal_space_cents,space_commission_cents,total_cents)
VALUES ('70000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000006',
        '50000000-0000-4000-8000-000000000002','room',1,'paid',5200,520,1600,192,7512);

WITH slot AS (
  SELECT current_date + CASE EXTRACT(DOW FROM current_date)::int
    WHEN 5 THEN 3
    WHEN 6 THEN 2
    ELSE 1
  END AS service_date
)
INSERT INTO bookfit.booking_occurrences
(id,order_id,service_date,starts_at,ends_at,status,location_id,x_service_cents,z_service_commission_cents,y_space_cents,w_space_commission_cents)
SELECT '71000000-0000-4000-8000-000000000005','70000000-0000-4000-8000-000000000005',service_date,
       (service_date + time '10:00') AT TIME ZONE 'Europe/Madrid',
       (service_date + time '10:50') AT TIME ZONE 'Europe/Madrid','confirmed',
       '20000000-0000-4000-8000-000000000002',5200,520,1600,192
FROM slot;

INSERT INTO bookfit.resource_allocations
(resource_kind,resource_id,location_id,service_date,starts_at,ends_at,order_id,status)
SELECT 'professional',o.professional_id,b.location_id,b.service_date,b.starts_at,b.ends_at,o.id,'confirmed'
FROM bookfit.orders o JOIN bookfit.booking_occurrences b ON b.order_id=o.id
WHERE o.id='70000000-0000-4000-8000-000000000005'
UNION ALL
SELECT 'space',o.space_id,b.location_id,b.service_date,b.starts_at,b.ends_at,o.id,'confirmed'
FROM bookfit.orders o JOIN bookfit.booking_occurrences b ON b.order_id=o.id
WHERE o.id='70000000-0000-4000-8000-000000000005';

INSERT INTO bookfit.order_lines (occurrence_id,line_type,description,amount_cents)
SELECT b.id,lines.line_type,lines.description,lines.amount_cents
FROM bookfit.booking_occurrences b CROSS JOIN LATERAL (VALUES
 ('service','Servicio de fisioterapia',b.x_service_cents),
 ('service_commission','Comisión del servicio · ejemplo 10%',b.z_service_commission_cents),
 ('space','Uso de Consulta Azul',b.y_space_cents),
 ('space_commission','Comisión del espacio · ejemplo 12%',b.w_space_commission_cents)
) AS lines(line_type,description,amount_cents)
WHERE b.order_id='70000000-0000-4000-8000-000000000005';

INSERT INTO bookfit.payment_attempts (order_id,provider,provider_reference,status,amount_cents)
VALUES ('70000000-0000-4000-8000-000000000005','fake','seed:70000000-0000-4000-8000-000000000005','succeeded',7512);
INSERT INTO bookfit.payment_events (provider,provider_event_id,payment_attempt_id,event_type)
SELECT provider,provider_reference,id,'seed.succeeded' FROM bookfit.payment_attempts
WHERE order_id='70000000-0000-4000-8000-000000000005';
