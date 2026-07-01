// ID helpers: internal ids and short public ids.
import { customAlphabet, nanoid } from "nanoid";

// Internal ids: default url-safe nanoid (21 chars).
export const newId = (): string => nanoid();

// Public share ids: 10 chars, unambiguous lowercase alphanumeric alphabet.
const publicAlphabet = "23456789abcdefghijkmnpqrstuvwxyz";
const publicNano = customAlphabet(publicAlphabet, 10);
export const newPublicId = (): string => publicNano();
