// Shared by api/notify.js and api/reminder.js: a random motivation picture
// per player, to show in push notifications. Alley pictures for Martin,
// Johnny Depp pictures for Karine. Full URLs so OneSignal / the phone can
// fetch the image. Keep these lists in sync with public/alley-pics and
// public/johnny-pics when pictures are added or removed.
const SITE_URL = 'https://couples-workout-challenge2.vercel.app';

const ALLEY_PICS = [
  '/alley-pics/alley-01b.webp',
  '/alley-pics/alley-02b.webp',
  '/alley-pics/alley-03b.webp',
  '/alley-pics/alley-04b.webp',
  '/alley-pics/alley-06b.webp',
  '/alley-pics/alley-07b.webp',
  '/alley-pics/alley-08b.webp',
  '/alley-pics/alley-09b.webp',
  '/alley-pics/alley-10.webp',
  '/alley-pics/alley-11b.webp',
  '/alley-pics/alley-12b.webp',
  '/alley-pics/alley-13.webp',
  '/alley-pics/alley-14b.webp',
  '/alley-pics/alley-15.webp',
  '/alley-pics/alley-16b.webp',
  '/alley-pics/alley-17.webp',
  '/alley-pics/alley-18.webp',
  '/alley-pics/alley-19.webp',
  '/alley-pics/alley-20.webp',
  '/alley-pics/alley-21.webp',
  '/alley-pics/alley-22.webp',
  '/alley-pics/alley-23.webp',
  '/alley-pics/alley-24.webp',
  '/alley-pics/alley-25.webp',
  '/alley-pics/alley-27.webp',
  '/alley-pics/alley-28.webp',
  '/alley-pics/alley-30.webp',
  '/alley-pics/alley-31.webp',
  '/alley-pics/alley-32.webp',
];

const JOHNNY_PICS = [
  '/johnny-pics/johnny-02.webp',
  '/johnny-pics/johnny-03.webp',
  '/johnny-pics/johnny-04.webp',
  '/johnny-pics/johnny-05.webp',
  '/johnny-pics/johnny-06.webp',
  '/johnny-pics/johnny-07.webp',
  '/johnny-pics/johnny-08.webp',
  '/johnny-pics/johnny-09.webp',
  '/johnny-pics/johnny-10.webp',
  '/johnny-pics/johnny-11.webp',
  '/johnny-pics/johnny-12.webp',
];

// externalId is the OneSignal external user id: 'martin' or 'karine'.
export function motivationPicFor(externalId) {
  const pics = externalId === 'karine' ? JOHNNY_PICS : ALLEY_PICS;
  return SITE_URL + pics[Math.floor(Math.random() * pics.length)];
}
