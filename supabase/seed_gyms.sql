-- ============================================================================
--  Szegedi kondik — forrás: OpenStreetMap (ODbL), lekérve 2026-09-20
--  28 edzőterem. Futtasd a schema.sql UTÁN.
--  Új kondit hozzáadni: egyszerűen INSERT egy sor ide.
-- ============================================================================

insert into public.gyms (name, address, lat, lng, osm_ref) values
  ('Berci', null, 46.245194, 20.142086, 'osm:46.245194,20.142086'),
  ('Blessed Gym', null, 46.235702, 20.173188, 'osm:46.235702,20.173188'),
  ('Cédrus Prémium Fitness', 'Bakay Nándor utca 24', 46.257473, 20.130532, 'osm:46.257473,20.130532'),
  ('Core Terem', null, 46.25469, 20.142791, 'osm:46.25469,20.142791'),
  ('Cosmotron Gym', null, 46.251334, 20.141535, 'osm:46.251334,20.141535'),
  ('Csúcsforma', null, 46.244496, 20.144776, 'osm:46.244496,20.144776'),
  ('Elite Fitness', null, 46.262136, 20.133286, 'osm:46.262136,20.133286'),
  ('Feeling Center', null, 46.262057, 20.133956, 'osm:46.262057,20.133956'),
  ('FitWorld', 'Dózsa utca 12', 46.255694, 20.153663, 'osm:46.255694,20.153663'),
  ('Forma 1 Fitnesz', 'Attila utca 17-19', 46.255515, 20.141835, 'osm:46.255515,20.141835'),
  ('Global Fitness', 'Makkosházi körút 1', 46.2736, 20.157027, 'osm:46.2736,20.157027'),
  ('Global Fitness kardió és spinning', null, 46.273284, 20.157622, 'osm:46.273284,20.157622'),
  ('GreenZone fitness', null, 46.278517, 20.168537, 'osm:46.278517,20.168537'),
  ('Gym Class', null, 46.266119, 20.129812, 'osm:46.266119,20.129812'),
  ('Haász Gym & Fitness', 'Szabadkai út 9/b', 46.240456, 20.119046, 'osm:46.240456,20.119046'),
  ('Izometria', 'Tisza Lajos körút 41', 46.255918, 20.147599, 'osm:46.255918,20.147599'),
  ('JM Fitness', null, 46.270112, 20.132482, 'osm:46.270112,20.132482'),
  ('Kathi Béla - The Legend', 'Etelka sor 1/A', 46.259579, 20.172398, 'osm:46.259579,20.172398'),
  ('Kolibri Fitness', 'Berlini körút 20', 46.260688, 20.147933, 'osm:46.260688,20.147933'),
  ('Maya Fitness', null, 46.250158, 20.159688, 'osm:46.250158,20.159688'),
  ('Megafitness', null, 46.250562, 20.158924, 'osm:46.250562,20.158924'),
  ('Speedfitness', null, 46.244664, 20.134371, 'osm:46.244664,20.134371'),
  ('Strong Body', null, 46.270083, 20.13211, 'osm:46.270083,20.13211'),
  ('Szegi Fitness', null, 46.271354, 20.159243, 'osm:46.271354,20.159243'),
  ('Ultratone & Wellness Stúdió', null, 46.237979, 20.127397, 'osm:46.237979,20.127397'),
  ('Underground Gym', null, 46.24914, 20.137266, 'osm:46.24914,20.137266'),
  ('Városi Sportcsarnok - Konditerem', null, 46.244542, 20.162444, 'osm:46.244542,20.162444'),
  ('Zenés termek', null, 46.235798, 20.139328, 'osm:46.235798,20.139328')
on conflict (osm_ref) do update
  set name = excluded.name,
      address = coalesce(excluded.address, public.gyms.address);
