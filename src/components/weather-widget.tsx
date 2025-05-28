"use client";

import type { WeatherData } from '@/types';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Wind, Droplets, Sun, Cloud, Search } from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

// IMPORTANT: Replace with your actual WeatherAPI key. Store it in .env.local
const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || 'YOUR_WEATHER_API_KEY';
const DEFAULT_LOCATION = 'Guernsey';


export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState(DEFAULT_LOCATION);

  const fetchWeather = async (location: string) => {
    if (WEATHER_API_KEY === 'YOUR_WEATHER_API_KEY') {
      setError("Weather API key not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${location}&aqi=no`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      const data: WeatherData = await response.json();
      setWeather(data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch weather data.");
      setWeather(null); // Clear previous weather data on error
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchWeather(DEFAULT_LOCATION);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationQuery.trim()) {
      fetchWeather(locationQuery.trim());
    }
  };

  if (WEATHER_API_KEY === 'YOUR_WEATHER_API_KEY') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Weather API Key not configured. Please add NEXT_PUBLIC_WEATHER_API_KEY to your .env.local file.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Weather</CardTitle>
         <form onSubmit={handleSearch} className="flex gap-2 mt-2">
          <Input 
            type="text"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            placeholder="Enter location"
            className="flex-grow"
          />
          <Button type="submit" size="icon" aria-label="Search weather">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-16 w-1/2" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {weather && !loading && !error && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-lg font-medium text-primary">
                {weather.location.name}, {weather.location.country}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(weather.location.localtime).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <div className="flex items-center justify-center my-2">
              {weather.current.condition.icon && (
                 <Image 
                    src={`https:${weather.current.condition.icon}`} 
                    alt={weather.current.condition.text} 
                    width={64} 
                    height={64}
                    data-ai-hint="weather condition" 
                  />
              )}
              <p className="text-5xl font-bold ml-2">{weather.current.temp_c}°C</p>
            </div>
            <p className="text-center text-lg capitalize">{weather.current.condition.text}</p>
            <p className="text-center text-sm text-muted-foreground">Feels like {weather.current.feelslike_c}°C</p>


            <div className="grid grid-cols-2 gap-3 pt-3 text-sm">
              <div className="flex items-center">
                <Wind className="mr-2 h-5 w-5 text-accent" />
                <span>{weather.current.wind_kph} kph ({weather.current.wind_dir})</span>
              </div>
              <div className="flex items-center">
                <Droplets className="mr-2 h-5 w-5 text-accent" />
                <span>Humidity: {weather.current.humidity}%</span>
              </div>
              <div className="flex items-center">
                <Thermometer className="mr-2 h-5 w-5 text-accent" />
                <span>UV Index: {weather.current.uv}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
