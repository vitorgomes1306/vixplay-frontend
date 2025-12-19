import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função para obter token da API Lytex
async function obtainLytexToken(systemConfig) {
  try {
    console.log('🔑 Obtendo token da API Lytex...');
    
    const tokenResponse = await fetch('https://api-pay.lytex.com.br/v2/auth/obtain_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grantType: "clientCredentials",
        clientId: systemConfig.clientId,
        clientSecret: systemConfig.clientSecret
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Erro ao obter token:', tokenResponse.status, errorData);
      throw new Error(`Erro ao obter token: ${errorData.message || 'Erro desconhecido'}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Token obtido com sucesso');
    console.log('🔍 DEBUG - Resposta completa do token:', JSON.stringify(tokenData, null, 2));
    console.log('🔍 DEBUG - Campos disponíveis na resposta:', Object.keys(tokenData));
    
    // Extrair o token usando o campo correto da API Lytex
    const extractedToken = tokenData.accessToken;
    
    console.log('🔍 DEBUG - Token extraído:', extractedToken ? `${extractedToken.substring(0, 20)}...` : 'null');
    
    // Salvar o token no systemConfig
    await prisma.systemConfig.update({
      where: { id: systemConfig.id },
      data: { 
        tokenApi: extractedToken,
        refreshToken: tokenData.refreshToken
      }
    });
    
    return extractedToken;
    
  } catch (error) {
    console.error('❌ Erro ao obter token Lytex:', error);
    throw error;
  }
}

// Função para renovar token da API Lytex
async function renewLytexToken(systemConfig) {
  try {
    console.log('🔄 Renovando token da API Lytex...');
    
    const renewResponse = await fetch('https://api-pay.lytex.com.br/v2/auth/renew_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: systemConfig.refreshToken
      })
    });
    
    if (!renewResponse.ok) {
      console.log('❌ Falha ao renovar token, obtendo novo token...');
      return await obtainLytexToken(systemConfig);
    }
    
    const tokenData = await renewResponse.json();
    console.log('✅ Token renovado com sucesso');
    
    // Salvar o novo token
    await prisma.systemConfig.update({
      where: { id: systemConfig.id },
      data: { 
        tokenApi: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || systemConfig.refreshToken
      }
    });
    
    return tokenData.accessToken;
    
  } catch (error) {
    console.error('❌ Erro ao renovar token, obtendo novo:', error);
    return await obtainLytexToken(systemConfig);
  }
}

// Rota POST /devices/:id/lytex-license
export async function lytexLicenseRoute(req, res) {
  try {
    const deviceId = parseInt(req.params.id);
    const { proportionalValue } = req.body; // Receber valor proporcional do frontend
    
    console.log('ROTA POST /devices/:id/lytex-license CHAMADA');
    console.log('🔍 DEBUG - Valor proporcional recebido do frontend:', proportionalValue);

    // Buscar dados do dispositivo com relacionamentos
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        panel: {
          include: {
            user: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    const user = device.panel.user;
    console.log('🔍 DEBUG - Dados do dispositivo:', JSON.stringify(device, null, 2));
    console.log('🔍 DEBUG - Dados do usuário:', JSON.stringify(user, null, 2));

    // Buscar configurações do sistema
    const systemConfig = await prisma.systemConfig.findFirst({
      where: { userId: user.id }
    });

    if (!systemConfig) {
      return res.status(404).json({ error: 'Configurações do sistema não encontradas' });
    }

    console.log('🔍 DEBUG - Configurações do sistema:', JSON.stringify(systemConfig, null, 2));
    console.log('🔍 DEBUG - ID do usuário:', user.id);
    console.log('🔍 DEBUG - ID do dispositivo:', deviceId);

    // Usar o valor proporcional calculado no frontend, se fornecido
    let finalValue;
    if (proportionalValue && proportionalValue > 0) {
      finalValue = proportionalValue;
      console.log('🔍 DEBUG - Usando valor proporcional do frontend:', finalValue);
    } else {
      // Fallback: calcular no backend (código anterior mantido como backup)
      console.log('🔍 DEBUG - Valor proporcional não fornecido, calculando no backend...');
      
      const deviceValueInCents = systemConfig.valueDevice ? parseFloat(systemConfig.valueDevice) : 5000;
      const deviceValue = deviceValueInCents / 100;
      
      const currentDate = new Date();
      const currentDay = currentDate.getDate();
      const userDayOfPayment = user.dayOfPayment;
      
      if (userDayOfPayment && userDayOfPayment > currentDay) {
        const daysUntilPayment = userDayOfPayment - currentDay;
        finalValue = (deviceValue / 30) * daysUntilPayment;
      } else {
        finalValue = deviceValue;
      }
      
      finalValue = Math.max(finalValue, 1.00);
    }
    
    // Taxa adicional do dispositivo Lytex
    const taxaDeviceLytex = 3.99; // R$ 2,50 de taxa
    finalValue = finalValue + taxaDeviceLytex;
    
    const valueInCents = Math.round(finalValue * 100);
    
    console.log('🔍 DEBUG - Valor antes da taxa:', (finalValue - taxaDeviceLytex).toFixed(2), 'reais');
    console.log('🔍 DEBUG - Taxa do dispositivo Lytex:', taxaDeviceLytex.toFixed(2), 'reais');
    console.log('🔍 DEBUG - Valor final usado (com taxa):', finalValue.toFixed(2), 'reais');
    console.log('🔍 DEBUG - valueInCents (para JSON):', valueInCents, 'centavos');

    // Gerar data de vencimento (30 dias a partir de hoje)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    // Ajustar para o fuso horário local (Brasil) para evitar problemas de data
    dueDate.setHours(23, 59, 59, 999); // Definir para o final do dia
    const dueDateFormatted = dueDate.toISOString();
    
    console.log('🔍 DEBUG - Data de hoje:', new Date().toLocaleDateString('pt-BR'));
    console.log('🔍 DEBUG - Data de vencimento:', dueDate.toLocaleDateString('pt-BR'));
    console.log('🔍 DEBUG - Data de vencimento ISO:', dueDateFormatted);

    // Função para limpar CPF/CNPJ (apenas números)
    function cleanCpfCnpj(cpfCnpj) {
      if (!cpfCnpj) return "";
      
      // Remove todos os caracteres não numéricos
      return cpfCnpj.replace(/\D/g, '');
    }

    // Determinar o tipo de cliente (pf ou pj)
    function getClientType(cpfCnpj) {
      if (!cpfCnpj) return "pf"; // padrão para pessoa física
      
      const numbers = cpfCnpj.replace(/\D/g, '');
      
      // CPF tem 11 dígitos = pessoa física
      if (numbers.length === 11) {
        return "pf";
      }
      // CNPJ tem 14 dígitos = pessoa jurídica
      else if (numbers.length === 14) {
        return "pj";
      }
      
      return "pf"; // padrão
    }

    // Formar JSON para API Lytex no formato correto
    const cleanedCpfCnpj = cleanCpfCnpj(user.cpfCnpj);
    const clientType = getClientType(user.cpfCnpj);
    
    const lytexPayload = {
      client: {
        type: clientType,
        treatmentPronoun: user.treatmentPronoun || "you",
        name: user.name || "Cliente",
        cpfCnpj: cleanedCpfCnpj,
        email: user.email,
        cellphone: user.cellphone || "",
        address: {
          zip: user.zipCode || "",
          city: user.city || "",
          street: user.street || "",
          state: user.state || "",
          zone: user.zone || ""
        }
      },
      items: [
        {
          name: `Licença de dispositivo - (${device.deviceKey || 'N/A'}) - ${user.name || 'Nome do cliente'}`,
          quantity: 1,
          value: valueInCents
        }
      ],
      dueDate: dueDateFormatted,
      paymentMethods: {
        pix: {
          enable: true
        },
        boleto: {
          enable: true
        },
        creditCard: {
          enable: false
        }
      }
    };

    console.log('📋 JSON formado para Lytex:', JSON.stringify(lytexPayload, null, 2));
    console.log('💰 VALOR NO JSON - items[0].value:', lytexPayload.items[0].value, 'centavos');
    console.log('💰 VALOR CONVERTIDO:', (lytexPayload.items[0].value / 100).toFixed(2), 'reais');
    console.log('🌐 Enviando para API Lytex: https://api-pay.lytex.com.br/v2/invoices');

    // Verificar se há token válido
    let token = systemConfig.tokenApi;
    
    if (!token) {
      console.log('🔑 Token não encontrado, obtendo novo token...');
      token = await obtainLytexToken(systemConfig);
    }

    // Fazer requisição para API Lytex
    console.log('🔑 Usando token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('📤 Enviando payload:', JSON.stringify(lytexPayload, null, 2));
    
    const lytexResponse = await fetch('https://api-pay.lytex.com.br/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(lytexPayload)
    });

    console.log('📥 Status da resposta:', lytexResponse.status);
    console.log('📥 Headers da resposta:', Object.fromEntries(lytexResponse.headers.entries()));
    
    let responseData;
    try {
      responseData = await lytexResponse.json();
      console.log('📥 Dados da resposta:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
      const responseText = await lytexResponse.text();
      console.log('📥 Resposta como texto:', responseText);
      responseData = { error: 'Resposta inválida da API', rawResponse: responseText };
    }

    if (!lytexResponse.ok) {
      console.error('❌ Erro da API Lytex:', lytexResponse.status, responseData);
      
      // Se erro 401 ou 410 (token expirado), tentar renovar token e repetir
      if (lytexResponse.status === 401 || lytexResponse.status === 410) {
        console.log('🔄 Token expirado, renovando token...');
        token = await renewLytexToken(systemConfig);
        
        // Repetir a requisição com novo token
        const retryResponse = await fetch('https://api-pay.lytex.com.br/v2/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(lytexPayload)
        });
        
        const retryData = await retryResponse.json();
        
        if (!retryResponse.ok) {
          console.error('❌ Erro na segunda tentativa:', retryResponse.status, retryData);
          return res.status(retryResponse.status).json({ 
            error: 'Erro na API Lytex após renovar token', 
            details: retryData 
          });
        }
        
        console.log('✅ Sucesso na segunda tentativa:', retryData);
        return res.json({ 
          success: true, 
          message: 'Licença enviada para Lytex com sucesso (após renovar token)', 
          data: retryData 
        });
      }
      
      return res.status(lytexResponse.status).json({ 
        error: 'Erro na API Lytex', 
        details: responseData 
      });
    }

    console.log('✅ Resposta da API Lytex:', responseData);

    // Debug: Mostrar estrutura completa da resposta
    console.log('🔍 DEBUG - Estrutura completa da resposta:', JSON.stringify(responseData, null, 2));
    
    // Debug: Verificar campos de ID disponíveis
    console.log('🔍 DEBUG - Possíveis IDs da fatura:');
    console.log('  - responseData.id:', responseData.id);
    console.log('  - responseData._id:', responseData._id);
    console.log('  - responseData.invoiceId:', responseData.invoiceId);
    console.log('  - responseData.paymentMethods?.pix?._referenceId:', responseData.paymentMethods?.pix?._referenceId);
    console.log('  - responseData.paymentMethods?.boleto?._referenceId:', responseData.paymentMethods?.boleto?._referenceId);

    res.json({ 
      success: true, 
      message: 'Licença enviada para Lytex com sucesso', 
      data: responseData 
    });

  } catch (error) {
    console.error('❌ Erro ao conectar com API Lytex:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: error.message 
    });
  }
}

// Rota GET /devices/:id/lytex-invoice/:invoiceId - Buscar dados da fatura
export async function getLytexInvoiceRoute(req, res) {
  try {
    const deviceId = parseInt(req.params.id);
    const invoiceId = req.params.invoiceId;
    
    console.log(`🔍 Buscando dados da fatura ${invoiceId} para dispositivo ${deviceId}`);

    // Buscar dados do dispositivo para obter configurações
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        panel: {
          include: {
            user: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    const user = device.panel.user;

    // Buscar configurações do sistema
    const systemConfig = await prisma.systemConfig.findFirst({
      where: { userId: user.id }
    });

    if (!systemConfig) {
      return res.status(404).json({ error: 'Configurações do sistema não encontradas' });
    }

    // Verificar se há token válido
    let token = systemConfig.tokenApi;
    
    if (!token) {
      console.log('🔑 Token não encontrado, obtendo novo token...');
      token = await obtainLytexToken(systemConfig);
    }

    // Fazer requisição para buscar dados da fatura na API Lytex
    console.log(`📤 Buscando fatura na API Lytex: https://api-pay.lytex.com.br/v2/invoices/${invoiceId}`);
    
    const lytexResponse = await fetch(`https://api-pay.lytex.com.br/v2/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📥 Status da resposta:', lytexResponse.status);
    
    let responseData;
    try {
      responseData = await lytexResponse.json();
      console.log('📥 Dados da fatura:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
      const responseText = await lytexResponse.text();
      console.log('📥 Resposta como texto:', responseText);
      return res.status(500).json({ error: 'Resposta inválida da API Lytex' });
    }

    if (!lytexResponse.ok) {
      console.error('❌ Erro da API Lytex:', lytexResponse.status, responseData);
      
      // Se erro 401 ou 410 (token expirado), tentar renovar token e repetir
      if (lytexResponse.status === 401 || lytexResponse.status === 410) {
        console.log('🔄 Token expirado, renovando token...');
        token = await renewLytexToken(systemConfig);
        
        // Repetir a requisição com novo token
        const retryResponse = await fetch(`https://api-pay.lytex.com.br/v2/invoices/${invoiceId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const retryData = await retryResponse.json();
        
        if (!retryResponse.ok) {
          console.error('❌ Erro na segunda tentativa:', retryResponse.status, retryData);
          return res.status(retryResponse.status).json({ 
            error: 'Erro na API Lytex após renovar token', 
            details: retryData 
          });
        }
        
        console.log('✅ Sucesso na segunda tentativa:', retryData);
        return res.json({ 
          success: true, 
          message: 'Dados da fatura obtidos com sucesso (após renovar token)', 
          data: retryData 
        });
      }
      
      return res.status(lytexResponse.status).json({ 
        error: 'Erro na API Lytex', 
        details: responseData 
      });
    }

    console.log('✅ Dados da fatura obtidos com sucesso:', responseData);

    res.json({ 
      success: true, 
      message: 'Dados da fatura obtidos com sucesso', 
      data: responseData 
    });

  } catch (error) {
    console.error('❌ Erro ao buscar dados da fatura:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: error.message 
    });
  }
}

// Rota GET /devices/:id/lytex-status/:invoiceId - Verificar status de pagamento
export async function checkLytexPaymentStatusRoute(req, res) {
  try {
    const deviceId = parseInt(req.params.id);
    const invoiceId = req.params.invoiceId;
    
    console.log(`💰 Verificando status de pagamento da fatura ${invoiceId} para dispositivo ${deviceId}`);

    // Buscar dados do dispositivo para obter configurações
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        panel: {
          include: {
            user: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    const user = device.panel.user;

    // Buscar configurações do sistema
    const systemConfig = await prisma.systemConfig.findFirst({
      where: { userId: user.id }
    });

    if (!systemConfig) {
      return res.status(404).json({ error: 'Configurações do sistema não encontradas' });
    }

    // Verificar se há token válido
    let token = systemConfig.tokenApi;
    
    if (!token) {
      console.log('🔑 Token não encontrado, obtendo novo token...');
      token = await obtainLytexToken(systemConfig);
    }

    // Fazer requisição para verificar status na API Lytex
    console.log(`📤 Verificando status na API Lytex: https://api-pay.lytex.com.br/v2/invoices/${invoiceId}/status`);
    
    const lytexResponse = await fetch(`https://api-pay.lytex.com.br/v2/invoices/${invoiceId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📥 Status da resposta:', lytexResponse.status);
    
    let responseData;
    try {
      responseData = await lytexResponse.json();
      console.log('📥 Status do pagamento:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
      const responseText = await lytexResponse.text();
      console.log('📥 Resposta como texto:', responseText);
      return res.status(500).json({ error: 'Resposta inválida da API Lytex' });
    }

    if (!lytexResponse.ok) {
      console.error('❌ Erro da API Lytex:', lytexResponse.status, responseData);
      
      // Se erro 401 ou 410 (token expirado), tentar renovar token e repetir
      if (lytexResponse.status === 401 || lytexResponse.status === 410) {
        console.log('🔄 Token expirado, renovando token...');
        token = await renewLytexToken(systemConfig);
        
        // Repetir a requisição com novo token
        const retryResponse = await fetch(`https://api-pay.lytex.com.br/v2/invoices/${invoiceId}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const retryData = await retryResponse.json();
        
        if (!retryResponse.ok) {
          console.error('❌ Erro na segunda tentativa:', retryResponse.status, retryData);
          return res.status(retryResponse.status).json({ 
            error: 'Erro na API Lytex após renovar token', 
            details: retryData 
          });
        }
        
        console.log('✅ Sucesso na segunda tentativa:', retryData);
        return res.json({ 
          success: true, 
          message: 'Status do pagamento obtido com sucesso (após renovar token)', 
          data: retryData 
        });
      }
      
      return res.status(lytexResponse.status).json({ 
        error: 'Erro na API Lytex', 
        details: responseData 
      });
    }

    console.log('✅ Status do pagamento obtido com sucesso:', responseData);

    res.json({ 
      success: true, 
      message: 'Status do pagamento obtido com sucesso', 
      data: responseData 
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status do pagamento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: error.message 
    });
  }
}

// Rota POST /devices/:id/register-license - Registrar licença após pagamento aprovado
export async function registerLicenseRoute(req, res) {
  try {
    const deviceId = parseInt(req.params.id);
    const { invoiceId, paymentData } = req.body;
    
    console.log(`📝 Registrando licença para dispositivo ${deviceId} com fatura ${invoiceId}`);

    // Buscar dados do dispositivo
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        panel: {
          include: {
            user: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    // Verificar se a licença já foi registrada
    const existingLicense = await prisma.deviceLicense.findFirst({
      where: {
        deviceId: deviceId,
        invoiceId: invoiceId
      }
    });

    if (existingLicense) {
      return res.json({
        success: true,
        message: 'Licença já registrada anteriormente',
        data: existingLicense
      });
    }

    // Calcular data de expiração (30 dias a partir de hoje)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Registrar a licença no banco de dados
    const newLicense = await prisma.deviceLicense.create({
      data: {
        deviceId: deviceId,
        userId: device.panel.user.id,
        invoiceId: invoiceId,
        status: 'active',
        activatedAt: new Date(),
        expiresAt: expirationDate,
        paymentMethod: paymentData?.paymentMethod || 'lytex',
        paymentAmount: paymentData?.amount || 0,
        paymentData: paymentData ? JSON.stringify(paymentData) : null
      }
    });

    // Atualizar status do dispositivo para licenciado
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        isLicensed: true,
        licenseExpiresAt: expirationDate,
        updatedAt: new Date()
      }
    });

    console.log('✅ Licença registrada com sucesso:', newLicense);

    res.json({
      success: true,
      message: 'Licença registrada com sucesso',
      data: {
        license: newLicense,
        device: {
          id: deviceId,
          isLicensed: true,
          licenseExpiresAt: expirationDate
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar licença:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

export default {
  lytexLicenseRoute,
  getLytexInvoiceRoute,
  checkLytexPaymentStatusRoute,
  registerLicenseRoute,
  obtainLytexToken,
  renewLytexToken
};