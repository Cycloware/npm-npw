const reg = /[\'\"]/

export function unquote(input: string) {
  if (!input) {
    return ''
  }
  if (reg.test(input.charAt(0))) {
    input = input.substr(1)
  }
  if (reg.test(input.charAt(input.length - 1))) {
    input = input.substr(0, input.length - 1)
  }
  return input
}
