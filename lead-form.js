const form = document.querySelector("#lead-form");
const messages = JSON.parse(document.querySelector("#form-messages").textContent);
const status = document.querySelector("#form-status");
const submit = form.querySelector("button[type=submit]");
const endpoint = form.dataset.endpoint.trim();
const vessel = form.elements.namedItem("vessel");
const port = form.elements.namedItem("port");
const email = form.elements.namedItem("email");
const imo = form.elements.namedItem("imo");
const extras = document.querySelector("#detalhes");
const inspection = form.elements.namedItem("inspection");
const equipment = Array.from(form.querySelectorAll('input[name="equipment"]'));
const equipmentCount = document.querySelector("#equipment-count");
const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid"];
const query = new URLSearchParams(window.location.search);
const campaign = {};

for (const key of campaignKeys) {
  const value = query.get(key);
  if (value) campaign[key] = value.slice(0, 250);
}

const inspectionFromAd = { anual: "annual", quinquenal: "five_yearly" };
const selectedInspection = query.get("inspecao");
if (Object.hasOwn(inspectionFromAd, selectedInspection)) {
  inspection.value = inspectionFromAd[selectedInspection];
}

let previousPayload = "";
let requestId = "";

if (endpoint) {
  document.querySelector("#form-note").textContent = messages.dataUse;
}

function updateEquipmentCount() {
  const total = equipment.filter((input) => input.checked).length;
  if (total === 0) {
    equipmentCount.textContent = equipmentCount.dataset.optional;
  } else {
    equipmentCount.textContent = total === 1 ? messages.oneEquipment : messages.manyEquipment.replace("{count}", total);
  }
}

function announce(message, state) {
  status.dataset.state = state;
  status.textContent = message;
  status.hidden = false;
  status.focus({ preventScroll: true });
}

for (const link of document.querySelectorAll("[data-equipment]")) {
  link.addEventListener("click", () => {
    const selected = equipment.find((input) => input.value === link.dataset.equipment);
    selected.checked = true;
    if (selected.value === "liferaft" && !inspection.value) inspection.value = "liferaft";
    if (selected.value !== "liferaft" && inspection.value === "liferaft") inspection.value = "";
    updateEquipmentCount();
    status.hidden = true;
  });
}

form.addEventListener("input", (event) => {
  event.target.setCustomValidity?.("");
  status.hidden = true;
  updateEquipmentCount();
});

imo.addEventListener("invalid", () => {
  extras.open = true;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  for (const field of [vessel, port, email]) {
    field.value = field.value.trim();
    field.setCustomValidity(field.value ? "" : messages.required);
  }
  if (email.validity.typeMismatch) email.setCustomValidity(messages.invalidEmail);
  inspection.setCustomValidity(inspection.value ? "" : messages.requiredService);

  const normalizedImo = imo.value.normalize("NFKC").trim().replace(/^IMO\s*/i, "").replace(/\s/g, "");
  const invalidImo = imo.value.trim() && !/^\d{7,8}$/.test(normalizedImo);
  imo.setCustomValidity(invalidImo ? messages.invalidImo : "");
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const details = {
    vessel: data.get("vessel"),
    imo: normalizedImo,
    port: data.get("port"),
    window: data.get("window").trim(),
    inspection: data.get("inspection"),
    email: data.get("email").trim(),
    equipment: data.getAll("equipment"),
    notes: data.get("notes").trim(),
    company: data.get("company").trim(),
    phone: data.get("phone").trim(),
    website: data.get("website"),
    language: document.documentElement.lang,
    campaign
  };

  if (!endpoint) {
    announce(messages.preview, "preview");
    return;
  }

  const serialized = JSON.stringify(details);
  if (serialized !== previousPayload) {
    previousPayload = serialized;
    requestId = crypto.randomUUID();
  }

  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  status.hidden = true;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...details, request_id: requestId }),
      signal: AbortSignal.timeout(12000)
    });
    const confirmation = await response.json();
    if (!response.ok || confirmation.accepted !== true) throw new Error("Pedido sem confirmação");

    form.reset();
    updateEquipmentCount();
    previousPayload = "";
    requestId = "";
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "generate_lead", form_id: "lsa_quote" });
    announce(messages.success, "success");
  } catch {
    announce(messages.error, "error");
  } finally {
    form.removeAttribute("aria-busy");
    submit.disabled = false;
  }
});

form.noValidate = true;
submit.disabled = false;
