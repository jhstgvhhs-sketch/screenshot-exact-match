UPDATE public.products
SET description = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(description, '(?i)Casa[[:space:]]+Touro', '', 'g'),
      '(?i)(na|da|pela|de)\\s+[,–—-]',
      '',
      'g'
    ),
    '[[:space:]]{2,}',
    ' ',
    'g'
  )
)
WHERE coalesce(description,'') ~* 'Casa[[:space:]]+Touro';
