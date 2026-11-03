-- Remove all third-party "Casa Touro" references from product copy.
UPDATE public.products
SET description = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        description,
        '(?i)(na|da|pela|de|para|em|comprar|adquirir|vendida pela|ao adquirir)\\s+Casa\\s+Touro\\s*[–—-]?\\s*',
        '',
        'g'
      ),
      '(?i)Casa\\s+Touro\\s*[–—-]?\\s*',
      '',
      'g'
    ),
    '[ \\t]+([,.])',
    '\\1',
    'g'
  )
)
WHERE coalesce(description,'') ~* 'Casa[[:space:]]+Touro|CasaTouro';
