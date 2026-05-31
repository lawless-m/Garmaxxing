//! Garmaxxing postcode loader.
//!
//! Reads OS Code-Point Open CSVs (one per postcode area) and writes a small
//! read-only SQLite table mapping a normalised postcode to a WGS84 centroid.
//! The nav app queries this directly — it is the only "search" in the system
//! (favourites + postcode, no geocoder). No Python anywhere.
//!
//! Usage: postcode-loader <codepoint-csv-dir> <out.sqlite>
//!
//! Code-Point Open CSV columns (no header): the postcode is column 0 and the
//! eastings/northings are columns 2 and 3.

mod osgb;

use std::fs;
use std::path::Path;
use std::process::ExitCode;

use rusqlite::Connection;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("usage: postcode-loader <codepoint-csv-dir> <out.sqlite>");
        return ExitCode::from(2);
    }
    match run(&args[1], &args[2]) {
        Ok(n) => {
            println!("[postcode-loader] wrote {n} postcodes");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("[postcode-loader] error: {e}");
            ExitCode::FAILURE
        }
    }
}

fn run(csv_dir: &str, out: &str) -> Result<usize, Box<dyn std::error::Error>> {
    let mut conn = Connection::open(out)?;
    conn.execute_batch(
        "PRAGMA journal_mode = OFF;
         PRAGMA synchronous = OFF;
         CREATE TABLE postcode (
             pc   TEXT PRIMARY KEY,  -- normalised, no spaces, upper-case
             lat  REAL NOT NULL,
             lon  REAL NOT NULL
         );",
    )?;

    let mut total = 0usize;
    let tx = conn.transaction()?;
    {
        let mut stmt =
            tx.prepare("INSERT OR REPLACE INTO postcode (pc, lat, lon) VALUES (?1, ?2, ?3)")?;
        for entry in fs::read_dir(csv_dir)? {
            let path = entry?.path();
            if path.extension().and_then(|s| s.to_str()) != Some("csv") {
                continue;
            }
            total += load_csv(&path, &mut stmt)?;
        }
    }
    tx.commit()?;

    // Tidy and index for fast point lookups (the table is read-only in use).
    conn.execute_batch("VACUUM; ANALYZE;")?;
    Ok(total)
}

fn load_csv(
    path: &Path,
    stmt: &mut rusqlite::Statement<'_>,
) -> Result<usize, Box<dyn std::error::Error>> {
    let text = fs::read_to_string(path)?;
    let mut count = 0;
    for line in text.lines() {
        let fields = parse_csv_line(line);
        if fields.len() < 4 {
            continue;
        }
        let pc = normalise_postcode(&fields[0]);
        let easting: f64 = match fields[2].trim().parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        let northing: f64 = match fields[3].trim().parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        if easting == 0.0 && northing == 0.0 {
            continue; // unplaced postcode
        }
        let ll = osgb::en_to_wgs84(easting, northing);
        stmt.execute(rusqlite::params![pc, ll.lat, ll.lon])?;
        count += 1;
    }
    Ok(count)
}

/// Minimal CSV split that strips surrounding double quotes. Code-Point Open
/// fields contain no embedded commas, so a full CSV parser isn't needed.
fn parse_csv_line(line: &str) -> Vec<String> {
    line.split(',')
        .map(|f| f.trim().trim_matches('"').to_string())
        .collect()
}

/// Normalise a postcode to a stable key: upper-case, no whitespace.
fn normalise_postcode(raw: &str) -> String {
    raw.chars()
        .filter(|c| !c.is_whitespace())
        .flat_map(|c| c.to_uppercase())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalises_postcodes() {
        // Quotes are already stripped by parse_csv_line; normalise just
        // upper-cases and removes whitespace.
        assert_eq!(normalise_postcode("sw1a 1aa"), "SW1A1AA");
        assert_eq!(normalise_postcode("EH8 9YL"), "EH89YL");
    }

    #[test]
    fn parses_quoted_fields() {
        let f = parse_csv_line("\"AB10 1AA\",10,394251,806376");
        assert_eq!(f[0], "AB10 1AA");
        assert_eq!(f[2], "394251");
    }

    #[test]
    fn converts_a_known_grid_reference() {
        // OS worked example: Caister water tower, E 651409.903 N 313177.270
        // → 52.6575°N, 1.7179°E (OSGB36). After Helmert to WGS84 it stays
        // within a few metres, so check to ~3 decimal places.
        let ll = osgb::en_to_wgs84(651409.903, 313177.270);
        assert!((ll.lat - 52.6576).abs() < 0.002, "lat was {}", ll.lat);
        assert!((ll.lon - 1.7180).abs() < 0.002, "lon was {}", ll.lon);
    }

    #[test]
    fn converts_central_london() {
        // Charing Cross area, ~E 530034 N 180381 → ~51.507°N, ~-0.122°E.
        let ll = osgb::en_to_wgs84(530034.0, 180381.0);
        assert!((ll.lat - 51.507).abs() < 0.01, "lat was {}", ll.lat);
        assert!((ll.lon - -0.122).abs() < 0.01, "lon was {}", ll.lon);
    }
}
