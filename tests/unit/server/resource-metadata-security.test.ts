import { isPrivateIpAddress } from "@/app/api/resource-metadata/route"

describe("proteção SSRF da leitura de metadados", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "100.64.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "192.168.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("bloqueia %s", (address) => {
    expect(isPrivateIpAddress(address)).toBe(true)
  })

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "permite endereço público %s",
    (address) => expect(isPrivateIpAddress(address)).toBe(false),
  )
})
