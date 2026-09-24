import { ParsedDeviceInfo } from '../../utils/deviceParser';
import { GeoLocationResult, GeoLocationService } from '../../utils/geolocation';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PriorSessionData {
  id: string;
  ip_address?: string | null;
  device_name?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  last_used_at?: string;
}

export interface RiskEvaluationResult {
  riskScore: number;
  riskLevel: RiskLevel;
  flaggedReasons: string[];
  isNewDevice: boolean;
  isNewIp: boolean;
  isNewCountry: boolean;
  isImpossibleTravel: boolean;
  travelDetails?: {
    priorLocation: string;
    currentLocation: string;
    distanceKm: number;
    hoursElapsed: number;
    calculatedSpeedKmH: number;
  };
  recommendation: 'ALLOW' | 'ALLOW_AND_ALERT' | 'REQUIRE_MFA' | 'REVOKE_AND_BLOCK';
}

export class RiskService {
  /**
   * Evaluates authentication risk using multi-signal heuristics.
   */
  static evaluateLoginRisk(
    device: ParsedDeviceInfo,
    geo: GeoLocationResult,
    ip: string,
    priorSessions: PriorSessionData[] = [],
    failedAttemptsCount = 0
  ): RiskEvaluationResult {
    let riskScore = 0;
    const flaggedReasons: string[] = [];

    // Filter out revoked/empty prior sessions
    const validPriors = priorSessions.filter(s => s && s.created_at);

    // If this is the user's first ever session, treat as normal baseline
    if (validPriors.length === 0) {
      return {
        riskScore: 0,
        riskLevel: 'LOW',
        flaggedReasons: [],
        isNewDevice: false,
        isNewIp: false,
        isNewCountry: false,
        isImpossibleTravel: false,
        recommendation: 'ALLOW'
      };
    }

    // 1. Signal: New Device (+20 points)
    const matchesDevice = validPriors.some(s => 
      (s.device_name && s.device_name === device.deviceName) ||
      (s.browser === device.browser && s.os === device.os)
    );
    const isNewDevice = !matchesDevice;
    if (isNewDevice) {
      riskScore += 20;
      flaggedReasons.push('NEW_DEVICE');
    }

    // 2. Signal: New IP Address (+10 points)
    const matchesIp = validPriors.some(s => s.ip_address && s.ip_address === ip);
    const isNewIp = !matchesIp && !GeoLocationService.isPrivateIp(ip);
    if (isNewIp) {
      riskScore += 10;
      flaggedReasons.push('NEW_IP_ADDRESS');
    }

    // 3. Signal: New Country (+40 points)
    const matchesCountry = validPriors.some(s => 
      s.country && s.country.toLowerCase() === geo.country.toLowerCase()
    );
    const isNewCountry = !matchesCountry && geo.country !== 'Unknown';
    if (isNewCountry) {
      riskScore += 40;
      flaggedReasons.push('NEW_COUNTRY_LOCATION');
    }

    // 4. Signal: Impossible Travel (>850 km/h between successive logins) (+60 points)
    let isImpossibleTravel = false;
    let travelDetails: RiskEvaluationResult['travelDetails'] | undefined;

    if (geo.latitude != null && geo.longitude != null) {
      // Find the most recent active session with coordinates
      const sortedSessions = [...validPriors].sort((a, b) => {
        const timeA = new Date(a.last_used_at || a.created_at || 0).getTime();
        const timeB = new Date(b.last_used_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      const mostRecent = sortedSessions.find(s => s.latitude != null && s.longitude != null);
      if (mostRecent && mostRecent.latitude != null && mostRecent.longitude != null) {
        const lastTime = new Date(mostRecent.last_used_at || mostRecent.created_at || Date.now()).getTime();
        const now = Date.now();
        const hoursElapsed = Math.max(0.01, (now - lastTime) / (1000 * 60 * 60)); // minimum ~36 seconds
        const distanceKm = GeoLocationService.calculateDistanceKm(
          mostRecent.latitude,
          mostRecent.longitude,
          geo.latitude,
          geo.longitude
        );

        const calculatedSpeedKmH = distanceKm / hoursElapsed;

        // If distance > 400 km and required velocity > 850 km/h (commercial jet cruising velocity)
        if (distanceKm > 400 && calculatedSpeedKmH > 850) {
          isImpossibleTravel = true;
          riskScore += 60;
          flaggedReasons.push('IMPOSSIBLE_PHYSICAL_TRAVEL');
          travelDetails = {
            priorLocation: `${mostRecent.city || 'Unknown'}, ${mostRecent.country || ''}`,
            currentLocation: geo.formattedLocation,
            distanceKm: Math.round(distanceKm),
            hoursElapsed: Math.round(hoursElapsed * 10) / 10,
            calculatedSpeedKmH: Math.round(calculatedSpeedKmH)
          };
        }
      }
    }

    // 5. Signal: Excessive Recent Failed Attempts (+20 points)
    if (failedAttemptsCount >= 3) {
      riskScore += 20;
      flaggedReasons.push('RECENT_FAILED_LOGIN_BURST');
    }

    // 6. Map Risk Score to Risk Level
    let riskLevel: RiskLevel = 'LOW';
    let recommendation: RiskEvaluationResult['recommendation'] = 'ALLOW';

    if (riskScore >= 90) {
      riskLevel = 'CRITICAL';
      recommendation = 'REVOKE_AND_BLOCK';
    } else if (riskScore >= 60) {
      riskLevel = 'HIGH';
      recommendation = 'ALLOW_AND_ALERT';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
      recommendation = 'ALLOW_AND_ALERT';
    } else {
      riskLevel = 'LOW';
      recommendation = 'ALLOW';
    }

    return {
      riskScore,
      riskLevel,
      flaggedReasons,
      isNewDevice,
      isNewIp,
      isNewCountry,
      isImpossibleTravel,
      travelDetails,
      recommendation
    };
  }
}
