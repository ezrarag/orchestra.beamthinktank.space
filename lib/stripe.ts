import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export const formatAmountForStripe = (amount: number, currency: string): number => {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  })
  const parts = numberFormat.formatToParts(amount)
  let zeroDecimalAmount = ''
  for (let part of parts) {
    if (part.type === 'integer') {
      zeroDecimalAmount += part.value
    }
  }
  return parseInt(zeroDecimalAmount)
}

export const formatAmountFromStripe = (amount: number, currency: string): string => {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  })
  return numberFormat.format(amount / 100)
}
