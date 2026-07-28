import { buildMapsUrl } from "../../lib/utils/maps";

type EventInfoProps = {
  nomeEvento: string | null;
  dataFormatada: string;
  horario: string;
  localCerimonia: string | null;
  localRecepcao: string | null;
  linkMapsCerimonia: string | null;
  linkMapsRecepcao: string | null;
};

function formatEventoDate(dataFormatada: string, horario: string) {
  if (dataFormatada && horario) return `${dataFormatada} às ${horario}`;
  if (dataFormatada) return dataFormatada;
  if (horario) return horario;
  return "Data não informada";
}

type LocationCardProps = {
  icon: string;
  title: string;
  subtitle: string;
  locationText: string | null;
  mapsLink: string | null;
};

function LocationCard({
  icon,
  title,
  subtitle,
  locationText,
  mapsLink,
}: LocationCardProps) {
  const normalizedLocation = String(locationText || "").trim();
  const destinationUrl = buildMapsUrl(mapsLink, normalizedLocation);

  return (
    <article className="event-location-card">
      <div className="event-location-head">
        <div className="event-location-icon" aria-hidden="true">
          {icon}
        </div>

        <div className="event-location-content">
          <h3 className="event-location-title">{title}</h3>
          <p className="event-location-subtitle">{subtitle}</p>
        </div>
      </div>

      <p className="event-location-text">
        {normalizedLocation || "Local ainda não informado."}
      </p>

      {destinationUrl ? (
        <a
          href={destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="event-button event-location-button"
          aria-label={`Abrir localização da ${title.toLowerCase()} no mapa`}
        >
          Ver localização
        </a>
      ) : (
        <button
          type="button"
          className="event-button event-location-button event-button--disabled"
          disabled
        >
          Localização indisponível
        </button>
      )}
    </article>
  );
}

export function EventInfo({
  nomeEvento,
  dataFormatada,
  horario,
  localCerimonia,
  localRecepcao,
  linkMapsCerimonia,
  linkMapsRecepcao,
}: EventInfoProps) {
  const dataEvento = formatEventoDate(dataFormatada, horario);

  return (
    <div className="event-info-block">
      <div className="event-info-header">
        <span className="event-section-badge">Evento</span>
        <h2 className="event-section-title">Informações do grande dia</h2>
        <p className="event-section-description">
          Confira os detalhes principais da cerimônia e da recepção para se
          organizar com tranquilidade.
        </p>
      </div>

      <div className="event-info-grid">
        <div className="event-info-item">
          <strong>Nome do evento</strong>
          <span>{nomeEvento || "Casamento"}</span>
        </div>

        <div className="event-info-item">
          <strong>Data e horário</strong>
          <span>{dataEvento}</span>
        </div>
      </div>

      <div className="event-location-grid">
        <LocationCard
          icon="⛪"
          title="Cerimônia"
          subtitle="Toque no botão abaixo para abrir a localização da cerimônia."
          locationText={localCerimonia}
          mapsLink={linkMapsCerimonia}
        />

        <LocationCard
          icon="🎉"
          title="Recepção"
          subtitle="Toque no botão abaixo para abrir a localização da recepção."
          locationText={localRecepcao}
          mapsLink={linkMapsRecepcao}
        />
      </div>
    </div>
  );
}
