export const CPC_IMAGES = {
  'Truck for Hire': '/truck.jpg',
  'Public Utility Jeepney': '/puj.jpg',
  'Public Utility Bus': '/pub.jpg',
  'Taxi': '/taxi.jpg',
  'School Transport': '/school.jpg',
  'Tourist Transport': '/tourist.jpg',
  'Utility Vehicle Express Service': '/uvexpress.jpg',
  'Shuttle Service': '/shuttle.jpg',
  'TNVS': '/tnvs.jpg',
};

export const DEFAULT_IMAGE = '/default-cpc.jpg';

export const cpcImageFor = (typeName) => CPC_IMAGES[typeName] || DEFAULT_IMAGE;