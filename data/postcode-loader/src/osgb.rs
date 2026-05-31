//! British National Grid (EPSG:27700) eastings/northings → WGS84 lat/lon.
//!
//! Two steps:
//!   1. Inverse Transverse Mercator on the Airy 1830 ellipsoid → OSGB36 lat/lon.
//!   2. Helmert datum shift OSGB36 → WGS84.
//!
//! The Helmert transform is accurate to a few metres. For Garmaxxing that is
//! plenty: a Code-Point postcode is a unit centroid covering ~15 addresses, so
//! the lookup is street-level by design. (OSTN15 is the survey-grade path if
//! ever needed.)

const A: f64 = 6_377_563.396; // Airy 1830 semi-major axis
const B: f64 = 6_356_256.909; // Airy 1830 semi-minor axis
const F0: f64 = 0.999_601_271_7; // central meridian scale factor
const LAT0: f64 = 49.0_f64; // true origin latitude (deg)
const LON0: f64 = -2.0_f64; // true origin longitude (deg)
const E0: f64 = 400_000.0; // easting of true origin
const N0: f64 = -100_000.0; // northing of true origin

#[derive(Debug, Clone, Copy)]
pub struct LatLon {
    pub lat: f64,
    pub lon: f64,
}

/// Convert grid eastings/northings (metres) to WGS84 lat/lon (degrees).
pub fn en_to_wgs84(easting: f64, northing: f64) -> LatLon {
    let (lat, lon) = en_to_airy_latlon(easting, northing);
    helmert_osgb36_to_wgs84(lat, lon)
}

fn en_to_airy_latlon(easting: f64, northing: f64) -> (f64, f64) {
    let lat0 = LAT0.to_radians();
    let lon0 = LON0.to_radians();
    let e2 = 1.0 - (B * B) / (A * A); // eccentricity squared
    let n = (A - B) / (A + B);

    let mut lat = lat0;
    let mut m = 0.0;
    // Iterate latitude until the meridional arc matches (northing - N0).
    while (northing - N0 - m).abs() >= 0.000_01 {
        lat = (northing - N0 - m) / (A * F0) + lat;
        m = meridional_arc(lat, lat0, n);
    }

    let sin_lat = lat.sin();
    let cos_lat = lat.cos();
    let tan_lat = lat.tan();

    let nu = A * F0 / (1.0 - e2 * sin_lat * sin_lat).sqrt();
    let rho = A * F0 * (1.0 - e2) / (1.0 - e2 * sin_lat * sin_lat).powf(1.5);
    let eta2 = nu / rho - 1.0;

    let tan2 = tan_lat * tan_lat;
    let tan4 = tan2 * tan2;
    let tan6 = tan4 * tan2;
    let sec_lat = 1.0 / cos_lat;

    let vii = tan_lat / (2.0 * rho * nu);
    let viii = tan_lat / (24.0 * rho * nu.powi(3)) * (5.0 + 3.0 * tan2 + eta2 - 9.0 * tan2 * eta2);
    let ix = tan_lat / (720.0 * rho * nu.powi(5)) * (61.0 + 90.0 * tan2 + 45.0 * tan4);
    let x = sec_lat / nu;
    let xi = sec_lat / (6.0 * nu.powi(3)) * (nu / rho + 2.0 * tan2);
    let xii = sec_lat / (120.0 * nu.powi(5)) * (5.0 + 28.0 * tan2 + 24.0 * tan4);
    let xiia =
        sec_lat / (5040.0 * nu.powi(7)) * (61.0 + 662.0 * tan2 + 1320.0 * tan4 + 720.0 * tan6);

    let de = easting - E0;
    let de2 = de * de;

    let lat_out = lat - vii * de2 + viii * de2 * de2 - ix * de2 * de2 * de2;
    let lon_out =
        lon0 + x * de - xi * de2 * de + xii * de2 * de2 * de - xiia * de2 * de2 * de2 * de;

    (lat_out.to_degrees(), lon_out.to_degrees())
}

/// Meridional arc length M from the true origin to `lat`, per the OS series.
fn meridional_arc(lat: f64, lat0: f64, n: f64) -> f64 {
    let n2 = n * n;
    let n3 = n2 * n;
    let dlat = lat - lat0; // φ − φ0
    let slat = lat + lat0; // φ + φ0

    let t1 = (1.0 + n + 1.25 * n2 + 1.25 * n3) * dlat;
    let t2 = (3.0 * n + 3.0 * n2 + 2.625 * n3) * dlat.sin() * slat.cos();
    let t3 = (1.875 * n2 + 1.875 * n3) * (2.0 * dlat).sin() * (2.0 * slat).cos();
    let t4 = (35.0 / 24.0) * n3 * (3.0 * dlat).sin() * (3.0 * slat).cos();

    B * F0 * (t1 - t2 + t3 - t4)
}

/// Approximate Helmert transform OSGB36 → WGS84 (metres / arc-seconds / ppm).
fn helmert_osgb36_to_wgs84(lat_deg: f64, lon_deg: f64) -> LatLon {
    // OSGB36 → WGS84 parameters (reverse of the published WGS84→OSGB36 set).
    let tx = 446.448;
    let ty = -125.157;
    let tz = 542.060;
    let s = -20.4894e-6; // scale
    let rx = (0.150_4_f64 / 3600.0).to_radians();
    let ry = (0.247_0_f64 / 3600.0).to_radians();
    let rz = (0.842_1_f64 / 3600.0).to_radians();

    // Airy 1830 (source) ellipsoid.
    let a1 = A;
    let e2_1 = 1.0 - (B * B) / (A * A);
    let (x1, y1, z1) = geodetic_to_cartesian(lat_deg, lon_deg, a1, e2_1);

    let x2 = tx + (1.0 + s) * (x1 - rz * y1 + ry * z1);
    let y2 = ty + (1.0 + s) * (rz * x1 + y1 - rx * z1);
    let z2 = tz + (1.0 + s) * (-ry * x1 + rx * y1 + z1);

    // GRS80 / WGS84 (target) ellipsoid.
    let a2 = 6_378_137.0;
    let b2 = 6_356_752.314_245;
    let e2_2 = 1.0 - (b2 * b2) / (a2 * a2);
    cartesian_to_geodetic(x2, y2, z2, a2, b2, e2_2)
}

fn geodetic_to_cartesian(lat_deg: f64, lon_deg: f64, a: f64, e2: f64) -> (f64, f64, f64) {
    let lat = lat_deg.to_radians();
    let lon = lon_deg.to_radians();
    let nu = a / (1.0 - e2 * lat.sin() * lat.sin()).sqrt();
    let x = nu * lat.cos() * lon.cos();
    let y = nu * lat.cos() * lon.sin();
    let z = (1.0 - e2) * nu * lat.sin();
    (x, y, z)
}

fn cartesian_to_geodetic(x: f64, y: f64, z: f64, a: f64, b: f64, e2: f64) -> LatLon {
    let lon = y.atan2(x);
    let p = (x * x + y * y).sqrt();
    let mut lat = z.atan2(p * (1.0 - e2));
    for _ in 0..10 {
        let nu = a / (1.0 - e2 * lat.sin() * lat.sin()).sqrt();
        lat = (z + e2 * nu * lat.sin()).atan2(p);
    }
    let _ = b; // b implied via e2; kept for clarity
    LatLon {
        lat: lat.to_degrees(),
        lon: lon.to_degrees(),
    }
}
