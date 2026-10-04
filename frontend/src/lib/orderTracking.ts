const ORDER_TOKEN_KEY = 'hookah-customer-order-token'

export function readOrderToken(): string | null {
  return sessionStorage.getItem(ORDER_TOKEN_KEY)
}

export function saveOrderToken(token: string | null): void {
  if (token) sessionStorage.setItem(ORDER_TOKEN_KEY, token)
  else sessionStorage.removeItem(ORDER_TOKEN_KEY)
}
