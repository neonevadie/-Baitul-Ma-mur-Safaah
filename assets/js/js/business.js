// business.js
import { DB, currentUser, appConfig, invItems, invCounter } from './constants.js';

export async function simpanBarang() { ... }
export function editBarang(i) { ... }
export async function simpanEditBarang() { ... }
export async function hapusBarang(i) { ... }
export function previewFoto(event) { ... }
export async function simpanInvoice() { ... }
export async function tandaiLunas(i) { ... }
export function hapusTransaksi(i) { ... }
export async function simpanMitra() { ... }
export async function hapusMitra(i) { ... }
export async function simpanStokMasuk() { ... }
export async function simpanStokKeluar() { ... }
export async function simpanPengeluaran() { ... }
export async function simpanPembelian() { ... }
export async function generateOpname() { ... }
export function addInvItem() { ... }
export function updateItemBarang(idx, sel) { ... }
export function updateItemQty(idx, input) { ... }
export function removeInvItem(idx, row) { ... }
export function hitungTotal() { ... }
export function toggleTempoField(metode) { ... }