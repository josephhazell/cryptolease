const PINATA_JWT = (process.env.NEXT_PUBLIC_PINATA_JWT as string) || "";

export async function uploadToPinata(file: File): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("Missing Pinata token. Set NEXT_PUBLIC_PINATA_JWT at build time.");
  }
  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append("pinataOptions", options);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}

export async function uploadJSONToPinata(json: object, name: string): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("Missing Pinata token. Set NEXT_PUBLIC_PINATA_JWT at build time.");
  }
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: {
        name: name,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Pinata JSON upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}

