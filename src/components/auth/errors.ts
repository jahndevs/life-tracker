export function toErrors(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}
