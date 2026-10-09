"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getEligibleMatchingCandidates } from "../catalog/eligibility.js";
import { PILOT_CATALOG_ELIGIBILITY } from "../catalog/eligibility.js";
import {
  getNextStep,
  getPreviousStep,
  QUESTION_STEPS,
  REVIEW_STEP_ID,
  validateAllAnswers,
} from "./steps.js";

const CHARGING_OPTIONS = [
  ["private_home", "En casa o en mi garaje", "Tengo un lugar privado donde podría instalar o usar un cargador."],
  ["workplace", "En mi trabajo", "Podría cargarlo durante parte del día."],
  ["public_only", "Solo en lugares públicos", "Dependería de cargadores fuera de casa y del trabajo."],
  ["none", "Hoy no tengo acceso a carga", "No cuento con un lugar conocido para cargar."],
  ["unsure", "Todavía no lo sé", "Aún estoy averiguando mis opciones."],
];

const SPACE_OPTIONS = [
  ["luggage", "Valijas o compras"],
  ["children", "Sillas infantiles o cochecito"],
  ["equipment", "Equipamiento deportivo o de trabajo"],
  ["large_items", "Objetos grandes con frecuencia"],
  ["none", "No tengo una necesidad especial de espacio"],
];

const ANSWER_LABELS = {
  budgetStatus: {
    defined: "Tengo un máximo en mente",
    not_defined: "Todavía no lo definí",
  },
  longTripStatus: {
    none: "No hago viajes largos habitualmente",
    has_trip: "Sí, hago viajes largos con cierta frecuencia",
  },
  chargingAccess: Object.fromEntries(
    CHARGING_OPTIONS.map(([value, label]) => [value, label]),
  ),
  spaceNeeds: Object.fromEntries(
    SPACE_OPTIONS.map(([value, label]) => [value, label]),
  ),
};

function getInitialAnswers() {
  return {
    budgetStatus: "",
    budgetAmount: "",
    budgetCurrency: "",
    dailyKm: "",
    longTripStatus: "",
    longTripKm: "",
    passengers: "",
    spaceNeeds: [],
    chargingAccess: "",
  };
}

function displayBudget(answers) {
  if (answers.budgetStatus === "not_defined") return "Todavía no definido";
  if (!answers.budgetAmount || !answers.budgetCurrency) return "Sin completar";

  const amount = new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 2,
  }).format(Number(answers.budgetAmount));
  return `${answers.budgetCurrency} ${amount}`;
}

function getSummaryRows(answers) {
  const trip =
    answers.longTripStatus === "none"
      ? ANSWER_LABELS.longTripStatus.none
      : `${answers.longTripKm || "—"} km por viaje (ida y vuelta, según tu estimación)`;

  return [
    {
      id: "budget",
      eyebrow: "Presupuesto",
      value: displayBudget(answers),
    },
    {
      id: "driving",
      eyebrow: "Recorridos",
      value: `${answers.dailyKm || "—"} km en un día habitual · ${trip}`,
    },
    {
      id: "space",
      eyebrow: "Personas y espacio",
      value: `${answers.passengers || "—"} ${Number(answers.passengers) === 1 ? "persona" : "personas"} · ${(answers.spaceNeeds ?? []).map((need) => ANSWER_LABELS.spaceNeeds[need]).filter(Boolean).join(", ") || "Sin completar"}`,
    },
    {
      id: "charging",
      eyebrow: "Acceso a carga",
      value: ANSWER_LABELS.chargingAccess[answers.chargingAccess] ?? "Sin completar",
    },
  ];
}

function ErrorMessage({ id, children }) {
  if (!children) return null;
  return (
    <p className="field-error" id={id} role="alert">
      {children}
    </p>
  );
}

function ChoiceCard({ name, value, checked, onChange, title, description }) {
  const id = `${name}-${value}`;
  return (
    <label className={`choice-card${checked ? " is-selected" : ""}`} htmlFor={id}>
      <input
        checked={checked}
        id={id}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span className="choice-copy">
        <span className="choice-title">{title}</span>
        {description ? <span className="choice-description">{description}</span> : null}
      </span>
      <span aria-hidden="true" className="choice-indicator" />
    </label>
  );
}

function AnswerSummary({ answers, onEdit, showEdit = true }) {
  return (
    <div className="answer-list">
      {getSummaryRows(answers).map((row) => (
        <section className="answer-row" key={row.id}>
          <div>
            <p className="answer-eyebrow">{row.eyebrow}</p>
            <p className="answer-value">{row.value}</p>
          </div>
          {showEdit ? (
            <button className="text-button" onClick={() => onEdit(row.id)} type="button">
              Cambiar
              <span className="visually-hidden">: {row.eyebrow}</span>
            </button>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export default function Questionnaire() {
  const [answers, setAnswers] = useState(getInitialAnswers);
  const [stepId, setStepId] = useState(QUESTION_STEPS[0].id);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef(null);
  const step = QUESTION_STEPS.find((item) => item.id === stepId);
  const currentIndex = QUESTION_STEPS.findIndex((item) => item.id === stepId);
  const summaryRows = useMemo(() => getSummaryRows(answers), [answers]);
  const matchingCandidates = useMemo(
    () => getEligibleMatchingCandidates(PILOT_CATALOG_ELIGIBILITY),
    [],
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepId, submitted]);

  function updateAnswer(field, value) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function goNext(event) {
    event.preventDefault();
    const result = getNextStep(stepId, answers);
    setErrors(result.errors);
    if (Object.keys(result.errors).length === 0) setStepId(result.stepId);
  }

  function editSection(sectionId) {
    setSubmitted(false);
    setErrors({});
    setStepId(sectionId);
  }

  function submitAnswers() {
    const allErrors = validateAllAnswers(answers);
    if (Object.keys(allErrors).length > 0) {
      const firstInvalidStep = QUESTION_STEPS.find((item) => allErrors[item.id]);
      setErrors(allErrors[firstInvalidStep.id]);
      setStepId(firstInvalidStep.id);
      return;
    }
    setSubmitted(true);
  }

  function restart() {
    setAnswers(getInitialAnswers());
    setStepId(QUESTION_STEPS[0].id);
    setErrors({});
    setSubmitted(false);
  }

  function renderBudgetStep() {
    return (
      <>
        <fieldset className="field-group" aria-describedby={errors.budgetStatus ? "budget-status-error" : undefined}>
          <legend className="field-label">¿Ya definiste un presupuesto máximo?</legend>
          <div className="choice-stack">
            <ChoiceCard
              checked={answers.budgetStatus === "defined"}
              name="budgetStatus"
              onChange={() => updateAnswer("budgetStatus", "defined")}
              title="Sí, tengo un máximo"
              value="defined"
            />
            <ChoiceCard
              checked={answers.budgetStatus === "not_defined"}
              name="budgetStatus"
              onChange={() => {
                updateAnswer("budgetStatus", "not_defined");
                updateAnswer("budgetAmount", "");
                updateAnswer("budgetCurrency", "");
              }}
              title="Todavía no lo definí"
              value="not_defined"
            />
          </div>
          <ErrorMessage id="budget-status-error">{errors.budgetStatus}</ErrorMessage>
        </fieldset>
        {answers.budgetStatus === "defined" ? (
          <div className="budget-fields">
            <div className="field-group">
              <label className="field-label" htmlFor="budgetAmount">Monto máximo</label>
              <div className="input-with-select">
                <input
                  aria-describedby={errors.budgetAmount ? "budget-amount-error" : undefined}
                  aria-invalid={Boolean(errors.budgetAmount)}
                  autoComplete="off"
                  id="budgetAmount"
                  inputMode="decimal"
                  min="0.01"
                  onChange={(event) => updateAnswer("budgetAmount", event.target.value)}
                  placeholder="Por ejemplo, 30.000"
                  type="number"
                  value={answers.budgetAmount}
                />
                <label className="visually-hidden" htmlFor="budgetCurrency">Moneda</label>
                <select
                  aria-describedby={errors.budgetCurrency ? "budget-currency-error" : undefined}
                  aria-invalid={Boolean(errors.budgetCurrency)}
                  id="budgetCurrency"
                  onChange={(event) => updateAnswer("budgetCurrency", event.target.value)}
                  value={answers.budgetCurrency}
                >
                  <option value="">Moneda</option>
                  <option value="USD">USD</option>
                  <option value="UYU">UYU</option>
                </select>
              </div>
              <ErrorMessage id="budget-amount-error">{errors.budgetAmount}</ErrorMessage>
              <ErrorMessage id="budget-currency-error">{errors.budgetCurrency}</ErrorMessage>
              <p className="field-hint">No pedimos datos de contacto ni guardamos esta respuesta.</p>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  function renderDrivingStep() {
    return (
      <>
        <div className="field-group">
          <label className="field-label" htmlFor="dailyKm">En un día habitual, ¿cuántos kilómetros manejás?</label>
          <div className="unit-input">
            <input
              aria-describedby={errors.dailyKm ? "daily-km-error" : "daily-km-hint"}
              aria-invalid={Boolean(errors.dailyKm)}
              id="dailyKm"
              inputMode="decimal"
              min="0"
              onChange={(event) => updateAnswer("dailyKm", event.target.value)}
              placeholder="Por ejemplo, 35"
              type="number"
              value={answers.dailyKm}
            />
            <span aria-hidden="true">km</span>
          </div>
          <ErrorMessage id="daily-km-error">{errors.dailyKm}</ErrorMessage>
          <p className="field-hint" id="daily-km-hint">Podés dar un aproximado.</p>
        </div>
        <fieldset className="field-group" aria-describedby={errors.longTripStatus ? "long-trip-status-error" : undefined}>
          <legend className="field-label">¿Hacés viajes largos con cierta frecuencia?</legend>
          <div className="choice-stack choice-stack-inline">
            <ChoiceCard
              checked={answers.longTripStatus === "has_trip"}
              name="longTripStatus"
              onChange={() => updateAnswer("longTripStatus", "has_trip")}
              title="Sí"
              value="has_trip"
            />
            <ChoiceCard
              checked={answers.longTripStatus === "none"}
              name="longTripStatus"
              onChange={() => {
                updateAnswer("longTripStatus", "none");
                updateAnswer("longTripKm", "");
              }}
              title="No habitualmente"
              value="none"
            />
          </div>
          <ErrorMessage id="long-trip-status-error">{errors.longTripStatus}</ErrorMessage>
        </fieldset>
        {answers.longTripStatus === "has_trip" ? (
          <div className="field-group">
            <label className="field-label" htmlFor="longTripKm">¿Cuántos kilómetros tiene ese viaje, ida y vuelta?</label>
            <div className="unit-input">
              <input
                aria-describedby={errors.longTripKm ? "long-trip-km-error" : undefined}
                aria-invalid={Boolean(errors.longTripKm)}
                id="longTripKm"
                inputMode="decimal"
                min="0.01"
                onChange={(event) => updateAnswer("longTripKm", event.target.value)}
                placeholder="Por ejemplo, 240"
                type="number"
                value={answers.longTripKm}
              />
              <span aria-hidden="true">km</span>
            </div>
            <ErrorMessage id="long-trip-km-error">{errors.longTripKm}</ErrorMessage>
          </div>
        ) : null}
      </>
    );
  }

  function renderSpaceStep() {
    function toggleSpaceNeed(value) {
      const current = answers.spaceNeeds;
      let next;
      if (value === "none") {
        next = current.includes("none") ? [] : ["none"];
      } else {
        const withoutNone = current.filter((item) => item !== "none");
        next = withoutNone.includes(value)
          ? withoutNone.filter((item) => item !== value)
          : [...withoutNone, value];
      }
      updateAnswer("spaceNeeds", next);
    }

    return (
      <>
        <div className="field-group">
          <label className="field-label" htmlFor="passengers">Personas que viajan con frecuencia</label>
          <div className="unit-input passenger-input">
            <input
              aria-describedby={errors.passengers ? "passengers-error" : "passengers-hint"}
              aria-invalid={Boolean(errors.passengers)}
              id="passengers"
              inputMode="numeric"
              min="1"
              onChange={(event) => updateAnswer("passengers", event.target.value)}
              placeholder="Incluyéndote"
              type="number"
              value={answers.passengers}
            />
            <span aria-hidden="true">personas</span>
          </div>
          <ErrorMessage id="passengers-error">{errors.passengers}</ErrorMessage>
          <p className="field-hint" id="passengers-hint">Incluí a quien maneja.</p>
        </div>
        <fieldset className="field-group" aria-describedby={errors.spaceNeeds ? "space-needs-error" : undefined}>
          <legend className="field-label">¿Qué necesitás llevar habitualmente?</legend>
          <div className="checkbox-stack">
            {SPACE_OPTIONS.map(([value, label]) => {
              const id = `spaceNeeds-${value}`;
              const checked = answers.spaceNeeds.includes(value);
              return (
                <label className={`check-card${checked ? " is-selected" : ""}`} htmlFor={id} key={value}>
                  <input
                    checked={checked}
                    id={id}
                    onChange={() => toggleSpaceNeed(value)}
                    type="checkbox"
                    value={value}
                  />
                  <span aria-hidden="true" className="checkmark" />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
          <ErrorMessage id="space-needs-error">{errors.spaceNeeds}</ErrorMessage>
        </fieldset>
      </>
    );
  }

  function renderChargingStep() {
    return (
      <fieldset className="field-group" aria-describedby={errors.chargingAccess ? "charging-access-error" : undefined}>
        <legend className="visually-hidden">¿Dónde podrías cargar el auto?</legend>
        <div className="choice-stack">
          {CHARGING_OPTIONS.map(([value, label, description]) => (
            <ChoiceCard
              checked={answers.chargingAccess === value}
              description={description}
              key={value}
              name="chargingAccess"
              onChange={() => updateAnswer("chargingAccess", value)}
              title={label}
              value={value}
            />
          ))}
        </div>
        <ErrorMessage id="charging-access-error">{errors.chargingAccess}</ErrorMessage>
      </fieldset>
    );
  }

  function renderStepFields() {
    if (stepId === "budget") return renderBudgetStep();
    if (stepId === "driving") return renderDrivingStep();
    if (stepId === "space") return renderSpaceStep();
    if (stepId === "charging") return renderChargingStep();
    return null;
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <a aria-label="Inicio, comparador de autos eléctricos" className="brand" href="#inicio">
          <span aria-hidden="true" className="brand-mark"><span /></span>
          <span>eléctrico<span className="brand-light">.uy</span></span>
        </a>
        <span className="header-note">Guía de compra independiente</span>
      </header>

      <section className="intro" id="inicio">
        <div className="intro-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> UNA DECISIÓN MÁS CLARA</p>
          <h1>Tu próximo auto eléctrico empieza por lo que necesitás.</h1>
          <p className="intro-description">
            Respondé unas preguntas simples sobre tu presupuesto, tus recorridos, el espacio y la carga.
          </p>
          <div className="intro-footnote">
            <span aria-hidden="true" className="shield-icon">✓</span>
            Sin cuenta. Tus respuestas no se guardan.
          </div>
        </div>
        <div aria-hidden="true" className="intro-art">
          <div className="sun-disc" />
          <div className="road-line road-line-one" />
          <div className="road-line road-line-two" />
          <div className="art-label">URUGUAY <span>•</span> MOVILIDAD ELÉCTRICA</div>
          <div className="car-shape">
            <span className="car-window" />
            <span className="car-wheel car-wheel-one" />
            <span className="car-wheel car-wheel-two" />
            <span className="car-light" />
          </div>
          <div className="art-spark spark-one">✳</div>
          <div className="art-spark spark-two">✳</div>
        </div>
      </section>

      <section aria-label="Cuestionario" className="questionnaire-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">TU GUÍA, PASO A PASO</p>
            <h2>Empecemos por conocerte</h2>
          </div>
          <span className="time-note"><span aria-hidden="true">◷</span> 2 minutos aprox.</span>
        </div>

        <div className="questionnaire-card">
          {!submitted && stepId !== REVIEW_STEP_ID && step ? (
            <>
              <div className="progress-header">
                <span className="step-counter">PASO {currentIndex + 1} <span>DE {QUESTION_STEPS.length}</span></span>
                <span className="progress-percent">{Math.round(((currentIndex + 1) / QUESTION_STEPS.length) * 100)}%</span>
              </div>
              <div
                aria-label={`Paso ${currentIndex + 1} de ${QUESTION_STEPS.length}`}
                className="progress-track"
                role="progressbar"
                aria-valuemin="1"
                aria-valuemax={QUESTION_STEPS.length}
                aria-valuenow={currentIndex + 1}
              >
                <span style={{ width: `${((currentIndex + 1) / QUESTION_STEPS.length) * 100}%` }} />
              </div>
              <div className="question-content">
                <p className="question-eyebrow">{step.eyebrow}</p>
                <h3 id="step-heading" ref={headingRef} tabIndex={-1}>{step.title}</h3>
                <p className="question-description">{step.description}</p>
                {Object.keys(errors).length > 0 ? (
                  <div className="error-summary" role="alert">
                    <span aria-hidden="true">!</span>
                    <p>Revisá los campos marcados antes de continuar.</p>
                  </div>
                ) : null}
                <form noValidate onSubmit={goNext}>
                  <div className="form-fields">{renderStepFields()}</div>
                  <div className="form-actions">
                    {currentIndex > 0 ? (
                      <button className="button button-secondary" onClick={() => { setErrors({}); setStepId(getPreviousStep(stepId)); }} type="button">
                        <span aria-hidden="true">←</span> Atrás
                      </button>
                    ) : <span />}
                    <button className="button button-primary" type="submit">
                      {currentIndex === QUESTION_STEPS.length - 1 ? "Revisar respuestas" : "Continuar"}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : null}

          {!submitted && stepId === REVIEW_STEP_ID ? (
            <div className="review-content">
              <p className="question-eyebrow">UN ÚLTIMO REPASO</p>
              <h3 id="step-heading" ref={headingRef} tabIndex={-1}>Revisá tus respuestas</h3>
              <p className="question-description">Podés cambiar cualquier dato antes de continuar.</p>
              <AnswerSummary answers={answers} onEdit={editSection} />
              <div className="form-actions review-actions">
                <button className="button button-secondary" onClick={() => setStepId(getPreviousStep(REVIEW_STEP_ID))} type="button">
                  <span aria-hidden="true">←</span> Atrás
                </button>
                <button className="button button-primary" onClick={submitAnswers} type="button">
                  Ver resultado <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ) : null}

          {submitted ? (
            <div className="result-content">
              <div className="result-icon" aria-hidden="true"><span>i</span></div>
              <p className="question-eyebrow">CUESTIONARIO COMPLETADO</p>
              <h3 id="step-heading" ref={headingRef} tabIndex={-1}>Todavía no podemos darte una recomendación confiable.</h3>
              <p className="result-message">
                Aún no tenemos suficientes vehículos con datos verificados y aprobados para comparar con lo que necesitás. Preferimos contártelo con claridad antes que mostrar opciones sin respaldo.
              </p>
              {matchingCandidates.length > 0 ? null : (
                <p className="result-detail">Estamos revisando la información local antes de habilitar recomendaciones.</p>
              )}
              <div className="result-summary-heading">
                <h4>Lo que nos contaste</h4>
                <button className="text-button" onClick={() => { setStepId(REVIEW_STEP_ID); setSubmitted(false); }} type="button">
                  Cambiar respuestas
                </button>
              </div>
              <AnswerSummary answers={answers} onEdit={editSection} showEdit={false} />
              <button className="button button-secondary restart-button" onClick={restart} type="button">
                Empezar de nuevo
              </button>
            </div>
          ) : null}
        </div>
        <p className="privacy-note"><span aria-hidden="true">⌑</span> Tus respuestas se usan solo para esta orientación y desaparecen al cerrar o actualizar la página.</p>
      </section>

      <footer className="site-footer">
        <span>eléctrico.uy</span>
        <span>Información clara para una decisión propia.</span>
      </footer>
    </main>
  );
}
