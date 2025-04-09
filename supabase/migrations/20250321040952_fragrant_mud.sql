/*
  # Update ship names to valid cruise lines

  1. Changes
    - Update existing CTR records to use only valid ship names
    - Restrict ships to Carnival, Princess, and Holland America Line vessels
    - Use actual ship names from these cruise lines

  2. Notes
    - Maintains existing CTR IDs and other data
    - Only updates the ship names
*/

UPDATE ctrs
SET ship = CASE floor(random() * 15)
  -- Carnival Ships
  WHEN 0 THEN 'CARNIVAL CELEBRATION'
  WHEN 1 THEN 'CARNIVAL JUBILEE'
  WHEN 2 THEN 'CARNIVAL LUMINOSA'
  WHEN 3 THEN 'CARNIVAL MARDI GRAS'
  WHEN 4 THEN 'CARNIVAL VENEZIA'
  -- Princess Ships
  WHEN 5 THEN 'CROWN PRINCESS'
  WHEN 6 THEN 'DISCOVERY PRINCESS'
  WHEN 7 THEN 'ENCHANTED PRINCESS'
  WHEN 8 THEN 'MAJESTIC PRINCESS'
  WHEN 9 THEN 'SUN PRINCESS'
  -- Holland America Line Ships
  WHEN 10 THEN 'MS NIEUW AMSTERDAM'
  WHEN 11 THEN 'MS ROTTERDAM'
  WHEN 12 THEN 'MS KONINGSDAM'
  WHEN 13 THEN 'MS ZUIDERDAM'
  ELSE 'MS NOORDAM'
END;