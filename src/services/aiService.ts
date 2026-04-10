
let ai: any = null;

export const extractCardName = async (base64Image: string): Promise<string | null> => {
  try {
    const response = await fetch("/api/extract-card-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Server error:", errorData.error);
      return null;
    }

    const data = await response.json();
    return data.name;
  } catch (error) {
    console.error("Error calling extraction API:", error);
    return null;
  }
};
