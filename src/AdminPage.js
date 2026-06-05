import React, { useState, useEffect } from 'react';
import './AdminPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function AdminPage() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const res = await fetch(`${API_URL}/api/visitors`);
        if (!res.ok) throw new Error('Erro na resposta');
        const data = await res.json();
        setVisitors(data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados. Certifique-se de que o backend esta rodando.');
      } finally {
        setLoading(false);
      }
    };
    fetchVisitors();
    const interval = setInterval(fetchVisitors, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="admin-container">
        <p className="loading-msg">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <p className="error-msg">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1>Painel Administrativo</h1>
      <p className="subtitle">Visitantes registrados: {visitors.length}</p>
      {visitors.length === 0 ? (
        <p className="empty-msg">Nenhum visitante registrado ainda.</p>
      ) : (
        <div className="table-wrapper">
          <table className="visitors-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>IP</th>
                <th>Cidade</th>
                <th>Dispositivo</th>
                <th>Data / Hora</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>{v.ip}</td>
                  <td>{v.city || '-'}</td>
                  <td>{v.device_type}</td>
                  <td>
                    {new Date(v.timestamp).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
