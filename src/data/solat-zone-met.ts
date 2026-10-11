// JAKIM zone -> MET Malaysia forecast location (api.data.gov.my/weather/forecast).
// Hand-picked 2026-10-11 from MET's live location list: the district (Ds…) of the
// zone's main town; special zones use MET's recreation spot (Rc…) where one exists
// (Pulau Tioman, Bukit Tinggi, Taman Nasional Kinabalu), else the enclosing district.
export const ZONE_MET: Record<string, string> = {
  JHR01: "Ds086", // Mersing (Pulau Aur, Pemanggil)
  JHR02: "Ds090", // Johor Bahru
  JHR03: "Ds085", // Kluang
  JHR04: "Ds084", // Batu Pahat
  KDH01: "Ds004", // Kota Setar
  KDH02: "Ds009", // Kuala Muda
  KDH03: "Ds006", // Padang Terap
  KDH04: "Ds015", // Baling
  KDH05: "Ds016", // Kulim
  KDH06: "Ds001", // Langkawi
  KDH07: "Ds007", // Yan (Gunung Jerai)
  KTN01: "Ds024", // Kota Bharu
  KTN02: "Ds039", // Gua Musang
  MLK01: "Ds078", // Melaka Tengah
  NGS01: "Ds077", // Tampin
  NGS02: "Ds072", // Kuala Pilah
  NGS03: "Ds068", // Seremban
  PHG01: "Rc024", // Pulau Tioman
  PHG02: "Ds069", // Kuantan
  PHG03: "Ds061", // Temerloh
  PHG04: "Ds059", // Bentong
  PHG05: "Rc017", // Bukit Tinggi
  PHG06: "Ds038", // Tanah Tinggi Cameron
  PHG07: "Ds080", // Rompin
  PRK01: "Ds041", // Batang Padang (Tapah)
  PRK02: "Ds032", // Kinta (Ipoh)
  PRK03: "Ds021", // Hulu Perak (Grik)
  PRK04: "Ds021", // Hulu Perak (Temengor, Belum)
  PRK05: "Ds029", // Manjung
  PRK06: "Ds020", // Larut, Matang Dan Selama (Taiping)
  PRK07: "Ds020", // Larut, Matang Dan Selama (Bukit Larut)
  PLS01: "Ds002", // Perlis
  PNG01: "Ds012", // Timur Laut (George Town)
  SBH01: "Ds565", // Sandakan
  SBH02: "Ds564", // Beluran
  SBH03: "Ds562", // Lahad Datu
  SBH04: "Ds552", // Tawau
  SBH05: "Ds567", // Kudat
  SBH06: "Rc501", // Taman Nasional Kinabalu
  SBH07: "Ds554", // Kota Kinabalu
  SBH08: "Ds547", // Keningau
  SBH09: "Ds545", // Beaufort
  SWK01: "Ds539", // Limbang
  SWK02: "Ds537", // Miri
  SWK03: "Ds531", // Bintulu
  SWK04: "Ds521", // Sibu
  SWK05: "Ds516", // Sarikei
  SWK06: "Ds509", // Sri Aman
  SWK07: "Ds505", // Serian
  SWK08: "Ds504", // Kuching
  SWK09: "Ds540", // Lawas (Kampung Patarikan)
  SGR01: "Ds057", // Petaling
  SGR02: "Ds049", // Kuala Selangor
  SGR03: "Ds054", // Klang
  TRG01: "Ds048", // Kuala Terengganu
  TRG02: "Ds037", // Besut
  TRG03: "Ds047", // Hulu Terengganu
  TRG04: "Ds056", // Dungun
  WLY01: "Ds058", // Kuala Lumpur
  WLY02: "Ds578", // Labuan
};
