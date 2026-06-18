export const PRODUCT_SIZE_ORDER = ['1 Ltr', '3 Ltr', '4.5 Ltr', '5×1 Pouch', '5×1 Nozzle', '10 Ltr'];

export function sortProductsBySize(products) {
  return [...products].sort((a, b) => {
    const ai = PRODUCT_SIZE_ORDER.indexOf(a.size);
    const bi = PRODUCT_SIZE_ORDER.indexOf(b.size);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
