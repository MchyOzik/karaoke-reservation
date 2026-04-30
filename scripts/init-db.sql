-- PostgreSQL Schema
DROP TYPE IF EXISTS room_cat CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

CREATE TYPE room_cat AS ENUM ('standard', 'vip', 'vvip');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category room_cat NOT NULL,
  capacity INT NOT NULL,
  price_per_hour DECIMAL(10,2) NOT NULL,
  description TEXT,
  photo_url VARCHAR(500),
  is_active SMALLINT DEFAULT 1
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  room_id INT REFERENCES rooms(id),
  customer_name VARCHAR(200) NOT NULL,
  alias VARCHAR(100), -- Display Name (Optional)
  customer_phone VARCHAR(50) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  payment_proof_url VARCHAR(500),
  status booking_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Ensure one room cannot be booked twice for the same slot
  UNIQUE (room_id, booking_date, start_time)
);

-- Seed Data
INSERT INTO rooms (name, category, capacity, price_per_hour, description, photo_url) VALUES
('Standard A', 'standard', 6, 75000, 'Cozy room for small groups.', 'https://media-cdn.tripadvisor.com/media/photo-s/06/59/79/45/the-wave.jpg'),
('VIP Lounge', 'vip', 10, 150000, 'Spacious room with leather sofas.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTi5HPJ9HW1xgKlgjcChA6avvK8CgM_bY2pmw&s'),
('Royal Suite', 'vvip', 15, 350000, 'Our most exclusive suite with premium sound system.', 'https://storage.googleapis.com/arsitagx-master-article/article-photo/277/cover.jpeg');
