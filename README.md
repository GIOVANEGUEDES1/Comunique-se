# COMUNIQUE-SE

Aplicativo web de Comunicação Aumentativa e Alternativa (CAA), feito com HTML5, CSS3, JavaScript e JSON. O exemplo Java é separado e não participa do funcionamento do site.

## Arquivos

- `index.html` — estrutura das telas.
- `styles.css` — identidade visual, responsividade e estilos de acessibilidade.
- `app.js` — navegação, voz, comunicação contextual, boneco interativo, alerta e configurações.
- `i18n.js` — idiomas (português, inglês e espanhol): traduções dos textos e das frases de dor. Para acrescentar outro idioma, veja o comentário no topo do arquivo.
- `data.json` — categorias, itens, ajustes e frases iniciais.
- `data.js` — cópia de segurança dos dados iniciais para permitir abrir o app por duplo clique.
- `java/ComunicaVidaDemo.java` — exemplo didático independente.

## Como abrir no Visual Studio Code

1. Extraia `ComunicaVida.zip` para uma pasta.
2. Abra o Visual Studio Code e escolha **File > Open Folder** (Arquivo > Abrir Pasta).
3. Selecione a pasta `ComunicaVida`.
4. Você pode abrir `index.html` com duplo clique. O projeto inclui `data.js` como alternativa quando o navegador bloqueia a leitura de `data.json` por `file://`.
5. Recomendado: instale a extensão **Live Server** no VS Code, clique com o botão direito em `index.html` e escolha **Open with Live Server**. Não é necessário instalar bibliotecas JavaScript.
6. A instalação como PWA e o funcionamento offline dependem de `localhost` ou HTTPS. Abra o app online uma vez para o service worker armazenar os arquivos; depois disso, a interface pode abrir sem rede.

## Como executar o exemplo Java

É necessário ter o JDK instalado. No terminal, dentro da pasta do projeto:

```bash
javac java/ComunicaVidaDemo.java
java -cp java ComunicaVidaDemo
```

O programa é apenas demonstrativo. Os dados cadastrados nele não são compartilhados com o aplicativo web.

## Recursos implementados nesta versão

- Tela inicial com exatamente quatro funções principais.
- Comunicação por categorias e itens, com ajustes contextuais numa única tela.
- Ajustes próprios para café, alimentos, bebidas frias, televisão, banheiro e descanso.
- Boneco interativo com vista frontal e traseira, seleção múltipla de regiões e intensidade/desconforto.
- Cadastro, edição e exclusão de familiares, com fotografia opcional.
- Síntese de voz do navegador, quando disponível; escolha de voz e velocidade.
- Alarme local alternável por toque, com som repetido e mensagem de voz.
- PWA com cache offline dos arquivos estáticos e ícone vetorial local.
- Varredura automática de foco para switches que enviam Enter/Espaço, com intervalo ajustável.
- Alvos de toque ampliados no mapa corporal; o desenho mantém rótulos e controles de teclado.
- Contatos de ajuda com telefone opcional e abertura manual do discador do aparelho.
- Preferências de fonte, alto contraste, período do dia e itens personalizados.
- Backup JSON com limite de tamanho e validação de estrutura/campos antes da importação; o arquivo exportado continua sem criptografia.
- Armazenamento local por `localStorage`.

## Limitações conhecidas e importantes

- O alarme é local. O app tenta manter a tela ativa quando o navegador oferece Wake Lock, mas o sistema ainda pode suspender a página. O app não envia notificações automáticas.
- A tela de ajuda pode abrir o discador para um telefone cadastrado, somente após toque. Não faz chamadas silenciosas e não integra serviços de emergência.
- A voz depende do navegador, do sistema operacional e das vozes instaladas.
- Os quatro pictogramas da tela inicial, o logotipo e o alarme são SVGs locais; opções internas e escalas ainda usam emojis e precisam de uma revisão pictográfica consistente.
- Nomes, telefones, fotos e preferências ficam sem criptografia no `localStorage`. O navegador pode conceder armazenamento persistente contra remoção automática, mas este protótipo não consegue impedir a limpeza manual dos dados do site.
- O protótipo não implementa login nem PIN. A janela de PIN antiga foi removida porque não era funcional; use a proteção de tela do sistema e não compartilhe o aparelho para dados pessoais.
- A importação rejeita arquivos incompatíveis antes de substituir o estado, mas os backups exportados não são criptografados. Guarde-os em local privado.
- A cópia offline só fica disponível depois que o service worker instalar com sucesso em `localhost`/HTTPS. Isso não sincroniza nem protege os dados pessoais locais.
- O boneco é uma ilustração vetorial simplificada para comunicação, não um instrumento de avaliação clínica.
- Frases e escala de dor ainda precisam de revisão de fonoaudiólogo/terapeuta; este software não foi validado clinicamente.
- Não foram executados testes com usuários reais, cuidadores, switches físicos, leitores de tela ou celulares antigos. Faça esses testes antes de uso real.
- Este protótipo não é uma solução LGPD completa: ainda precisa de análise de finalidade/base legal, consentimento quando aplicável, retenção/exclusão, controle de acesso e revisão jurídica/técnica antes de uso com dados reais.

## Checklist de teste manual

- [ ] A tela inicial mostra apenas as quatro funções principais.
- [ ] A seção de comunicação abre categorias e itens.
- [ ] Todos os ajustes do café aparecem numa única tela, com rolagem se necessário.
- [ ] Os ajustes de comida, bebida, TV, banheiro e descanso são exibidos numa única tela.
- [ ] O boneco permite selecionar/desselecionar várias regiões nas vistas frontal e traseira.
- [ ] A mensagem de dor é formada e falada, quando a voz está disponível.
- [ ] É possível cadastrar, editar e excluir pessoas e anexar foto.
- [ ] As ações de pessoas exibem e falam frases sem simular uma chamada.
- [ ] O primeiro toque ativa o alarme; o segundo interrompe.
- [ ] O som do alarme não cria intervalos duplicados ao tocar repetidamente.
- [ ] Preferências e itens personalizados permanecem após recarregar a página.
- [ ] JSON inválido é rejeitado sem substituir os dados atuais.
- [ ] Telefone válido de um contato aparece na tela de ajuda e abre o discador após toque.
- [ ] PWA instala e abre offline após a primeira carga online em `localhost`/HTTPS.
- [ ] Varredura automática avança foco e aciona corretamente com switch físico.
- [ ] Regiões pequenas do mapa são testadas com toque, teclado e leitor de tela.
- [ ] Fonte e alto contraste podem ser alterados.
- [ ] Layout é verificado em celular, tablet e computador.
- [ ] Exemplo Java compila e executa separadamente.

## Privacidade

Os dados pessoais ficam no armazenamento local do navegador, sem criptografia. Escolhas de dor não são persistidas. Não há envio para servidores nesta versão, nem autenticação ou proteção de acesso pelo app. Backups também não são criptografados. Não use dados reais até completar a revisão de privacidade/LGPD e os testes necessários.


### Navegação em telas separadas

Na área **Quero comunicar**, primeiro a pessoa escolhe uma categoria (por exemplo, comida/cozinha). Os itens dessa categoria aparecem em uma nova tela; ao tocar em um item, as opções de ajuste aparecem em outra tela. Os botões de voltar permitem retornar à lista anterior sem voltar ao início. Esse fluxo foi pensado para facilitar o uso em celulares e evitar que muitas opções fiquem acumuladas na mesma página.
