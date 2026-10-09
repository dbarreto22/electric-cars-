export const QUESTION_STEPS = [
  {
    id: "budget",
    eyebrow: "01 · Presupuesto",
    title: "¿Qué presupuesto tenés en mente?",
    description:
      "Podés indicar un máximo o contarnos que todavía no lo definiste.",
  },
  {
    id: "driving",
    eyebrow: "02 · Tus recorridos",
    title: "¿Cuánto manejás normalmente?",
    description:
      "Una estimación nos ayuda a entender tus trayectos de todos los días y los viajes más largos que hacés con cierta frecuencia.",
  },
  {
    id: "space",
    eyebrow: "03 · Espacio",
    title: "¿Cuántas personas y qué cosas viajás?",
    description:
      "Contá a todas las personas, incluido quien maneja. Podés elegir más de una necesidad de espacio.",
  },
  {
    id: "charging",
    eyebrow: "04 · Carga",
    title: "¿Dónde podrías cargar el auto?",
    description:
      "Elegí la opción que mejor describa tu situación hoy. No asumimos que haya cargadores disponibles cerca.",
  },
];

export const REVIEW_STEP_ID = "review";

export function getNextStep(stepId, answers) {
  const errors = validateQuestionStep(stepId, answers);
  if (Object.keys(errors).length > 0) {
    return { stepId, errors };
  }

  const currentIndex = QUESTION_STEPS.findIndex((step) => step.id === stepId);
  if (currentIndex < 0) return { stepId: QUESTION_STEPS[0].id, errors: {} };

  return {
    stepId:
      QUESTION_STEPS[currentIndex + 1]?.id ?? REVIEW_STEP_ID,
    errors: {},
  };
}

export function getPreviousStep(stepId) {
  if (stepId === REVIEW_STEP_ID) {
    return QUESTION_STEPS.at(-1).id;
  }

  const currentIndex = QUESTION_STEPS.findIndex((step) => step.id === stepId);
  if (currentIndex <= 0) return QUESTION_STEPS[0].id;
  return QUESTION_STEPS[currentIndex - 1].id;
}

export function validateQuestionStep(stepId, answers) {
  const errors = {};

  if (stepId === "budget") {
    if (!answers.budgetStatus) {
      errors.budgetStatus = "Elegí si ya tenés un máximo o si todavía no lo definiste.";
    }
    if (answers.budgetStatus === "defined") {
      const amount = Number(answers.budgetAmount);
      if (!answers.budgetAmount || !Number.isFinite(amount) || amount <= 0) {
        errors.budgetAmount = "Ingresá un monto mayor que cero.";
      }
      if (!["USD", "UYU"].includes(answers.budgetCurrency)) {
        errors.budgetCurrency = "Elegí dólares o pesos uruguayos.";
      }
    }
  }

  if (stepId === "driving") {
    const dailyKm = Number(answers.dailyKm);
    if (answers.dailyKm === "" || !Number.isFinite(dailyKm) || dailyKm < 0) {
      errors.dailyKm = "Ingresá una distancia de cero o más kilómetros.";
    }
    if (!["none", "has_trip"].includes(answers.longTripStatus)) {
      errors.longTripStatus = "Indicá si hacés viajes largos con cierta frecuencia.";
    }
    if (answers.longTripStatus === "has_trip") {
      const longTripKm = Number(answers.longTripKm);
      if (
        answers.longTripKm === "" ||
        !Number.isFinite(longTripKm) ||
        longTripKm <= 0
      ) {
        errors.longTripKm = "Ingresá una distancia mayor que cero kilómetros.";
      }
    }
  }

  if (stepId === "space") {
    const passengers = Number(answers.passengers);
    if (
      answers.passengers === "" ||
      !Number.isInteger(passengers) ||
      passengers < 1
    ) {
      errors.passengers = "Indicá al menos una persona.";
    }
    if (!Array.isArray(answers.spaceNeeds) || answers.spaceNeeds.length === 0) {
      errors.spaceNeeds = "Elegí al menos una opción de espacio.";
    }
  }

  if (stepId === "charging" && !answers.chargingAccess) {
    errors.chargingAccess = "Elegí la opción que mejor describa tu acceso a carga.";
  }

  return errors;
}

export function validateAllAnswers(answers) {
  return QUESTION_STEPS.reduce((allErrors, step) => {
    const stepErrors = validateQuestionStep(step.id, answers);
    return Object.keys(stepErrors).length === 0
      ? allErrors
      : { ...allErrors, [step.id]: stepErrors };
  }, {});
}
