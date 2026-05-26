import { formatUnits } from 'viem'

type FormatBigintOptions = {
    decimals?: number
    fractionDigits?: number
    fixed?: boolean
    fallback?: string
}

function trimTrailingZeros(value: string) {
    return value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export function formatBigintAmount(value: bigint | string, options: FormatBigintOptions = {}) {
    const {
        decimals = 18,
        fractionDigits = 2,
        fixed = false,
        fallback = '0',
    } = options

    try {
        if (decimals < 0 || !Number.isInteger(decimals)) {
            return fallback
        }

        if (fractionDigits !== undefined && (fractionDigits < 0 || !Number.isInteger(fractionDigits))) {
            return fallback
        }

        const bigintValue = typeof value === 'bigint' ? value : BigInt(value)
        const amount = formatUnits(bigintValue, decimals)
        const [integerPart, decimalPart = ''] = amount.split('.')
        const decimal = fractionDigits === undefined
            ? decimalPart
            : decimalPart.slice(0, fractionDigits).padEnd(fixed ? fractionDigits : 0, '0')
        const formatted = decimal ? `${integerPart}.${decimal}` : integerPart

        return fixed ? formatted : trimTrailingZeros(formatted)
    } catch {
        return fallback
    }
}
