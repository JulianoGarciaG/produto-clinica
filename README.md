# Tempo de Espera Estimado — Clínica

Um sistema simples para a clínica mostrar, em tempo real, quanto tempo falta para o paciente ser
atendido — sem precisar de aplicativo, cadastro ou senha.

## Como funciona

1. **O paciente chega e escaneia um QR code** (fixado na recepção ou sala de espera).
2. **Toca em um único botão** para confirmar presença — pronto, já está na fila.
3. **A tela mostra o tempo estimado de espera**, em minutos, e o horário da última atualização.
   - Quem já fez check-in vê uma estimativa personalizada, baseada na sua posição real na fila.
   - Quem só está olhando o QR code (sem check-in) vê o tempo médio atual de espera da clínica.
4. A fila é única e por ordem de chegada (o primeiro a chegar é o primeiro a ser atendido). O
   sistema nunca mostra "você é o 5º da fila" — só o tempo estimado.

O tempo estimado é recalculado automaticamente a cada 5 minutos, com base na duração média dos
últimos atendimentos realizados.

## Painel da recepção

A equipe da recepção tem acesso a uma tela protegida por senha para:

- Dar baixa (check-out) em um paciente já atendido
- Corrigir ou remover um check-in feito por engano
- Pausar a fila temporariamente (ex: emergência)
- Ajustar manualmente o tempo médio de atendimento, se necessário

## Rodando o projeto

```bash
npm install
cp .env.example .env   # defina uma senha em ADMIN_PASSWORD antes de usar de verdade
npm start
```

- Página do paciente (para o QR code): `http://localhost:3000/`
- Painel da recepção: `http://localhost:3000/admin/`

Requer Node.js 22.5 ou mais recente.
